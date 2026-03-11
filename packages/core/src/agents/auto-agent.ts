/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LocalAgentDefinition } from './types.js';
import type { z } from 'zod';
import type { Config } from '../config/config.js';
import { ALL_TOOLS } from '../tools/tools.js';

/**
 * The Auto Agent orchestrates multi-step execution tasks, validates them in the background
 * via ghost worktrees, and loops until the task succeeds or hits a hard limit.
 */
export function AutoAgent(_config: Config): LocalAgentDefinition<z.ZodTypeAny> {
  return {
    kind: 'local',
    name: 'auto-agent',
    description: 'Autonomous multi-step execution and validation agent.',
    experimental: true,
    modelConfig: {
      model: 'inherit',
      generateContentConfig: {
        temperature: 0,
      },
    },
    runConfig: {
      maxTurns: 20, // Strict limit to prevent infinite token burn
    },
    // We provide all general tools PLUS our specialized background validation tool
    toolConfig: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion
      tools: [...ALL_TOOLS, 'spawn_background_validation'] as any,
    },
    systemPrompt: `You are the Auto Drive Orchestrator.
Your task is to autonomously execute user requests.

# Rules:
1. Plan your approach internally using thoughts.
2. Use tools like 'run_shell_command', 'replace', or 'write_file' to implement the changes.
3. DO NOT yield to the user for intermediate confirmation.
4. When you believe a chunk of work is done, you MUST verify it by calling 'spawn_background_validation' with a relevant test or build command.
5. If a command or validation fails, read the stderr, deduce the issue, fix the code, and try again.
6. Only call 'complete_task' when you have verified the objective is successfully implemented AND passes validation.`,
  };
}
