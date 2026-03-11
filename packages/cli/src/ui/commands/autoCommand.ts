/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CommandContext,
  SlashCommand,
} from './types.js';
import { CommandKind } from './types.js';
import { coreEvents, debugLogger } from '@google/gemini-cli-core';
import type { AgentDefinition } from '@google/gemini-cli-core';
import { MessageType } from '../types.js';

export const autoCommand: SlashCommand = {
  name: 'auto',
  description: 'Start an autonomous multi-step execution loop',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  action: async (context: CommandContext, args?: string) => {
    const config = context.services.config;
    if (!config) {
      debugLogger.debug('Auto command: config is not available in context');
      return;
    }

    if (!args || typeof args !== 'string' || args.trim().length === 0) {
      coreEvents.emitFeedback('warning', 'Usage: /auto <task description>');
      return;
    }

    const agentRegistry = context.services.agentRegistry;
    if (!agentRegistry) {
      debugLogger.debug('Auto command: agentRegistry is not available in context');
      return;
    }

    const autoAgentDef = agentRegistry.getDefinition('auto-agent') as AgentDefinition | undefined;
    if (!autoAgentDef) {
        coreEvents.emitFeedback('error', 'Auto agent is not available or registered.');
        return;
    }

    coreEvents.emitFeedback('info', 'Starting autonomous drive loop... (Hold on to your butts)');

    // Set the agent in the UI context so the next chat turn routes to it
    context.ui.setAgent(autoAgentDef);

    // Inject the prompt directly
    context.ui.addItem({
      type: MessageType.USER,
      text: args.trim(),
    });

    // The core chat loop will pick this up automatically because we set the agent
  },
};
