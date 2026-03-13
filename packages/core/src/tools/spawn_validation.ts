/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolResult,
} from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { createGhostWorktree } from '../utils/worktreeUtils.js';
import { spawn } from 'node:child_process';
import { getShellConfiguration } from '../utils/shell-utils.js';
import { coreEvents } from '../utils/events.js';
import { debugLogger } from '../utils/debugLogger.js';
import { Type, type Schema } from '@google/genai';
import { ToolErrorType } from './tool-error.js';
import { truncateMiddle } from '../utils/string-utils.js';

export interface SpawnValidationParams {
  command: string;
}

export class SpawnValidationTool extends BaseDeclarativeTool<
  SpawnValidationParams,
  ToolResult
> {
  constructor(messageBus: MessageBus) {
    super(
      'spawn_background_validation',
      'Spawn Background Validation',
      'Creates a background git worktree and spawns a validation command inside it. Returns immediately.',
      Kind.Execute,
      {
        type: Type.OBJECT,
        properties: {
          command: {
            type: Type.STRING,
            description: 'The exact shell command to run (e.g., "npm test").',
          },
        },
        required: ['command'],
      } as Schema,
      messageBus,
    );
  }

  protected override validateToolParamValues(
    params: SpawnValidationParams,
  ): string | null {
    if (!params.command) {
      return 'Command is required.';
    }
    return null;
  }

  protected override createInvocation(
    params: SpawnValidationParams,
    messageBus: MessageBus,
    toolName: string,
    toolDisplayName: string,
  ): SpawnValidationInvocation {
    return new SpawnValidationInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }

  override getSchema() {
    return {
      name: this.name,
      description: this.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      parameters: this.parameterSchema as Schema,
    };
  }
}

export class SpawnValidationInvocation extends BaseToolInvocation<
  SpawnValidationParams,
  ToolResult
> {
  getDescription(): string {
    return `Spawn background validation: ${String(this.params.command)}`;
  }

  override async execute(): Promise<ToolResult> {
    const command = String(this.params.command);

    try {
      const worktreePath = await createGhostWorktree();
      const shellConfig = getShellConfiguration();
      const argsArray = [...shellConfig.argsPrefix, command];

      const child = spawn(shellConfig.executable, argsArray, {
        cwd: worktreePath,
        env: process.env,
        windowsHide: true,
      });

      child.on('close', (code: number | null) => {
        debugLogger.log(
          `[Background Validation] Command "${command}" exited with code ${String(code)} in ${worktreePath}`,
        );
        coreEvents.emitFeedback(
          'info',
          `Background Validation completed: ${command} (Exit code: ${String(code)})`,
        );
      });

      child.on('error', (err: Error) => {
        debugLogger.error(`[Background Validation] Failed to spawn:`, err);
        coreEvents.emitFeedback(
          'error',
          `Background Validation failed: ${err.message}`,
        );
      });

      return {
        returnDisplay: `Validation command "${command}" started in background worktree: ${worktreePath}.`,
        llmContent: [
          {
            text: `Validation command started successfully in: ${worktreePath}`,
          },
        ],
      };
    } catch (e) {
      const msg = truncateMiddle(e instanceof Error ? e.message : String(e));
      return {
        returnDisplay: `Failed to start background validation: ${msg}`,
        llmContent: [{ text: `Failed: ${msg}` }],
        error: {
          type: ToolErrorType.EXECUTION_FAILED,
          message: msg,
        },
      };
    }
  }
}
