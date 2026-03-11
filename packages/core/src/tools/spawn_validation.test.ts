/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawnValidationTool } from './spawn_validation.js';
import * as worktreeUtils from '../utils/worktreeUtils.js';
import * as childProcess from 'node:child_process';
import type { ToolExecutionContext } from '../scheduler/tool-executor.js';
import type { MessageBus } from '../confirmation-bus/messageBus.js';

vi.mock('../utils/worktreeUtils.js', () => ({
  createGhostWorktree: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

describe('spawnValidationTool', () => {
  let mockMessageBus: { publish: ReturnType<typeof vi.fn> };
  let mockContext: ToolExecutionContext;
  let mockSpawn: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockChildProcess: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockMessageBus = {
      publish: vi.fn(),
    };

    mockContext = {
      messageBus: mockMessageBus as unknown as MessageBus,
    } as ToolExecutionContext;

    mockChildProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    };

    mockSpawn = vi.mocked(childProcess.spawn).mockReturnValue(mockChildProcess);
  });

  it('creates a worktree and spawns a process', async () => {
    vi.mocked(worktreeUtils.createGhostWorktree).mockResolvedValue(
      '/mock/path',
    );

    const result = await spawnValidationTool.execute(
      { command: 'npm test' },
      mockContext,
    );

    expect(worktreeUtils.createGhostWorktree).toHaveBeenCalled();
    expect(mockSpawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['npm test']),
      expect.objectContaining({ cwd: '/mock/path' }),
    );

    expect(result).toContain('Validation command "npm test" started');
    expect(result).toContain('/mock/path');
  });

  it('returns an error if worktree creation fails', async () => {
    vi.mocked(worktreeUtils.createGhostWorktree).mockRejectedValue(
      new Error('Git failure'),
    );

    const result = await spawnValidationTool.execute(
      { command: 'npm test' },
      mockContext,
    );

    expect(result).toContain(
      'Failed to start background validation: Git failure',
    );
    expect(mockSpawn).not.toHaveBeenCalled();
  });
});
