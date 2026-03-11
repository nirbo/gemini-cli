/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { ToolBuilder } from './tools.js';
import { createGhostWorktree } from '../utils/worktreeUtils.js';
import { spawn } from 'node:child_process';
import { debugLogger } from '../utils/debugLogger.js';
import { getShellConfiguration } from '../utils/shell-utils.js';

const inputSchema = z.object({
  command: z
    .string()
    .describe(
      'The exact shell command to run for validation (e.g., "npm test").',
    ),
});

type InputType = z.infer<typeof inputSchema>;

export const spawnValidationTool = new ToolBuilder<InputType, string>()
  .name('spawn_background_validation')
  .description(
    'Creates a background git worktree and spawns a validation command (like tests or build) inside it. Returns immediately.',
  )
  .inputSchema(inputSchema)
  .executor(async (args, context) => {
    const command = String(args.command);

    try {
      const worktreePath = await createGhostWorktree();
      const shellConfig = getShellConfiguration();
      const argsArray = [...shellConfig.argsPrefix, command];

      const child = spawn(
        shellConfig.executable,
        argsArray,
        {
          cwd: worktreePath,
          env: process.env,
          windowsHide: true,
        },
      );

      let output = '';

      if (child.stdout) {
        child.stdout.on('data', (data: { toString: () => string }) => {
          output += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data: { toString: () => string }) => {
          output += data.toString();
        });
      }

      child.on('close', (code: number | null) => {
        debugLogger.log(
          `[Background Validation] Command "${command}" exited with code ${String(code)} in ${worktreePath}`,
        );

        context.messageBus.publish({
            type: 'tool-execution-success',
            toolName: 'spawn_background_validation',
            result: {
                command,
                worktreePath,
                code,
                output: output.substring(0, 5000), // Keep it reasonable
            }
        });
      });

      child.on('error', (err: Error) => {
        debugLogger.error(`[Background Validation] Failed to spawn:`, err);
      });

      return `Validation command "${command}" started in background worktree: ${worktreePath}. The agent will be notified upon completion.`;
    } catch (e) {
      if (e instanceof Error) {
          return `Failed to start background validation: ${e.message}`;
      }
      return `Failed to start background validation: ${String(e)}`;
    }
  })
  .build();
