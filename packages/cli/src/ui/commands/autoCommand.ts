/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandContext, SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import { coreEvents, debugLogger } from '@google/gemini-cli-core';

export const autoCommand: SlashCommand = {
  name: 'auto',
  description: 'Start an autonomous multi-step execution loop',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  action: async (context: CommandContext, args?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const isAutoDriveEnabled = (context.services.settings as any)?.merged
      ?.experimental?.autoDrive;
    if (
      !isAutoDriveEnabled &&
      process.env['GEMINI_CLI_SETTING_experimental_autoDrive'] !== 'true'
    ) {
      coreEvents.emitFeedback(
        'error',
        'Auto Drive is experimental and currently disabled. Enable it in your settings.',
      );
      return;
    }

    const config = context.services.config;
    if (!config) {
      debugLogger.debug('Auto command: config is not available in context');
      return;
    }

    if (!args || typeof args !== 'string' || args.trim().length === 0) {
      coreEvents.emitFeedback('warning', 'Usage: /auto <task description>');
      return;
    }

    const agentRegistry = config.getAgentRegistry();
    if (!agentRegistry) {
      debugLogger.debug(
        'Auto command: agentRegistry is not available in context',
      );
      return;
    }

    const autoAgentDef = agentRegistry.getDefinition('auto-agent');
    if (!autoAgentDef) {
      coreEvents.emitFeedback(
        'error',
        'Auto agent is not available or registered.',
      );
      return;
    }

    coreEvents.emitFeedback(
      'info',
      'Starting auto-drive mode...',
    );

    // Turn on the footer UI indicator
    context.ui.setAutoDriveActive(true);

    return {
      type: 'submit_prompt',
      content: [{ text: `@auto-agent ${args.trim()}` }],
    };
  },
};
