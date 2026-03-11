/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoCommand } from './autoCommand.js';
import type { CommandContext } from './types.js';
import { coreEvents } from '@google/gemini-cli-core';
import { MessageType } from '../types.js';

vi.mock('@google/gemini-cli-core', async () => {
    const actual = await vi.importActual('@google/gemini-cli-core');
    return {
        ...actual,
        coreEvents: {
            emitFeedback: vi.fn(),
        },
        debugLogger: {
            debug: vi.fn(),
            log: vi.fn(),
        }
    };
});

describe('autoCommand', () => {
    let mockContext: CommandContext;
    let mockSetAgent: ReturnType<typeof vi.fn>;
    let mockAddItem: ReturnType<typeof vi.fn>;
    let mockGetDefinition: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSetAgent = vi.fn();
        mockAddItem = vi.fn();
        mockGetDefinition = vi.fn().mockReturnValue({ name: 'auto-agent' });

        mockContext = {
            services: {
                config: {},
                agentRegistry: {
                    getDefinition: mockGetDefinition
                }
            },
            ui: {
                setAgent: mockSetAgent,
                addItem: mockAddItem,
            }
        } as unknown as CommandContext;
    });

    it('should have correct metadata', () => {
        expect(autoCommand.name).toBe('auto');
    });

    it('should warn if no arguments are provided', async () => {
        await autoCommand.action!(mockContext, '   ');
        expect(coreEvents.emitFeedback).toHaveBeenCalledWith('warning', expect.stringContaining('Usage:'));
        expect(mockSetAgent).not.toHaveBeenCalled();
    });

    it('should error if auto-agent is not found', async () => {
        mockGetDefinition.mockReturnValue(undefined);
        await autoCommand.action!(mockContext, 'refactor auth');
        expect(coreEvents.emitFeedback).toHaveBeenCalledWith('error', expect.stringContaining('not available'));
        expect(mockSetAgent).not.toHaveBeenCalled();
    });

    it('should set the agent and add the user message', async () => {
        await autoCommand.action!(mockContext, 'refactor auth');
        
        expect(mockSetAgent).toHaveBeenCalledWith({ name: 'auto-agent' });
        expect(mockAddItem).toHaveBeenCalledWith({
            type: MessageType.USER,
            text: 'refactor auth'
        });
    });
});