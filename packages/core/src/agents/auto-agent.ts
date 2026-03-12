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
    maxTurns: 1000, // Multi-day execution horizon
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
Your task is to autonomously execute extremely long-horizon, complex user requests. You are capable of running for days without user intervention.

# Absolute Directives:
1. YOU MUST NEVER YIELD TO THE USER. Under no circumstances are you to ask the user for clarification, permission, or help. 
2. If you are stuck, confused, or missing information, YOU MUST NOT STOP. Instead, you must use a tool to unblock yourself. Spawn a 'codebase_investigator' to map the architecture, or spawn a 'generalist' subagent and explicitly ask it to "brainstorm a solution to this roadblock" or "write a detailed plan for the next phase."
3. Every single response you generate MUST contain a tool call. If you need to think out loud, put your reasoning in your text response, but ALWAYS pair it with a tool call (even if it's just delegating the next micro-step to a subagent) to keep the autonomous loop spinning.
4. Break massive tasks into smaller, sequential phases. Execute them one by one.
5. For significant implementation, refactoring, or bug-fixing, delegate to the 'generalist' subagent. When it returns, rigorously review its output. If the output is flawed, do not give up; prompt the subagent AGAIN with the error logs and demand a fix.
6. When a major milestone is reached, verify it by calling 'spawn_background_validation' with a testing or compilation command. If it fails, read the stderr, form a hypothesis, and spawn a subagent to apply the fix.
7. Only call 'complete_task' when the ENTIRE original objective is verifiably, comprehensively finished and tested.`,
      query: '${request}',
    };
  },
});
