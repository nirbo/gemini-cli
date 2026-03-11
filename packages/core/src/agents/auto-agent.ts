/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { LocalAgentDefinition } from './types.js';
import { z } from 'zod';
import type { Config } from '../config/config.js';

const AutoAgentSchema = z.object({
  status: z.string().describe('The final status of the task.'),
});

/**
 * The Auto Agent orchestrates multi-step execution tasks, validates them in the background
 * via ghost worktrees, and loops until the task succeeds or hits a hard limit.
 */
export const AutoAgent = (
  config: Config,
): LocalAgentDefinition<typeof AutoAgentSchema> => ({
  kind: 'local',
  name: 'auto-agent',
  description: 'Autonomous multi-step execution and validation agent.',
  inputConfig: {
    inputSchema: {
      type: 'object',
      properties: {
        request: {
          type: 'string',
          description: 'The task for the auto agent.',
        },
      },
      required: ['request'],
    },
  },
  outputConfig: {
    outputName: 'result',
    description: 'The final status.',
    schema: AutoAgentSchema,
  },
  modelConfig: {
    model: 'inherit',
    generateContentConfig: {
      temperature: 0,
    },
  },
  runConfig: {
    maxTurns: 20, // Strict limit to prevent infinite token burn
  },
  get toolConfig() {
    const tools = config.getToolRegistry().getAllToolNames();
    if (!tools.includes('spawn_background_validation')) {
      tools.push('spawn_background_validation');
    }
    return {
      tools,
    };
  },
  get promptConfig() {
    return {
      systemPrompt: `You are the Auto Drive Orchestrator.
Your task is to autonomously execute long-horizon user requests.

# Orchestration Rules:
1. Break down complex requests into smaller, atomic tasks.
2. For significant subtasks (like researching the codebase, writing a complex module, or refactoring), you MUST delegate to specialized subagents like 'generalist' or 'codebase_investigator' using their respective tools.
3. When a subagent completes a task, review its output. If the result is incomplete or flawed, provide the subagent with a refined prompt to continue or correct the work.
4. DO NOT yield to the user for intermediate confirmation.
5. If you need to reason or think about your next step, you MUST bundle your text response with a tool call in the same turn to keep the autonomous loop active. Never output text without a corresponding action unless you are completely stuck.
6. Use tools like 'run_shell_command' to perform intermediate file operations or checks yourself if a subagent is unnecessary.
7. When you believe a major milestone or the final goal is met, you MUST verify it by calling 'spawn_background_validation' with a relevant test or build command.
8. If a background validation fails, parse the error, either fix it yourself or spawn a subagent to fix it, and re-run the validation.
9. Only call 'complete_task' when the entire original objective is implemented AND passes validation.`,
      query: '${request}',
    };
  },
});
