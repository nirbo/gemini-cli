/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGhostWorktree, cleanupGhostWorktree } from './worktreeUtils.js';
import { spawnAsync } from './shell-utils.js';
import { findGitRoot } from './gitUtils.js';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof fs>('node:fs/promises');
  return {
    ...actual,
    appendFile: vi.fn(),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn(),
  };
});

vi.mock('./shell-utils.js', () => ({
  spawnAsync: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

vi.mock('./gitUtils.js', () => ({
  findGitRoot: vi.fn(),
}));

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof os>('node:os');
  return {
    ...actual,
    tmpdir: vi.fn(),
  };
});

const mockedFs = vi.mocked(fs);
const mockedSpawnAsync = vi.mocked(spawnAsync);
const mockedFindGitRoot = vi.mocked(findGitRoot);
const mockedOs = vi.mocked(os);

describe('worktreeUtils', () => {
  beforeEach(() => {
    mockedFindGitRoot.mockReturnValue('/test/repo');
    mockedOs.tmpdir.mockReturnValue('/test/tmp');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createGhostWorktree', () => {
    it('should create a worktree without a specific commit hash', async () => {
      const worktreePath = await createGhostWorktree();

      expect(findGitRoot).toHaveBeenCalledWith(process.cwd());
      expect(worktreePath).toMatch(/\/test\/tmp\/gemini-ghost-worktree-.*/);

      expect(mockedSpawnAsync).toHaveBeenCalledWith(
        'git',
        [
          'worktree',
          'add',
          '--detach',
          expect.stringMatching(/.*gemini-ghost-worktree-.*/),
        ],
        { cwd: '/test/repo' },
      );

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        '/test/repo/.git/info/exclude',
        expect.stringMatching(/\n\/test\/tmp\/gemini-ghost-worktree-.*\n/),
      );
    });

    it('should create a worktree with a specific commit hash', async () => {
      const commitHash = 'abcdef123';
      const worktreePath = await createGhostWorktree(commitHash);

      expect(worktreePath).toMatch(/\/test\/tmp\/gemini-ghost-worktree-.*/);

      expect(mockedSpawnAsync).toHaveBeenCalledWith(
        'git',
        [
          'worktree',
          'add',
          '--detach',
          expect.stringMatching(/.*gemini-ghost-worktree-.*/),
          commitHash,
        ],
        { cwd: '/test/repo' },
      );

      expect(mockedFs.appendFile).toHaveBeenCalledWith(
        '/test/repo/.git/info/exclude',
        expect.stringMatching(/\n\/test\/tmp\/gemini-ghost-worktree-.*\n/),
      );
    });

    it('should throw an error if not in a git repository', async () => {
      mockedFindGitRoot.mockReturnValue(null);
      await expect(createGhostWorktree()).rejects.toThrow(
        'Not in a git repository.',
      );
    });

    it('should throw an error if git worktree add fails', async () => {
      const gitError = new Error('git failed') as Error & { stderr: string };
      gitError.stderr = 'fatal: worktree add failed';
      mockedSpawnAsync.mockRejectedValue(gitError);

      await expect(createGhostWorktree()).rejects.toThrow(
        `Failed to create worktree: ${gitError.message}\n${gitError.stderr}`,
      );
    });
  });

  describe('cleanupGhostWorktree', () => {
    it('should remove the worktree and clean up the exclude file', async () => {
      const worktreePath = '/test/tmp/gemini-ghost-worktree-abcdef';
      mockedFs.readFile.mockResolvedValue(`
/some/other/path
${worktreePath}
/another/path
`);

      await cleanupGhostWorktree(worktreePath);

      expect(mockedSpawnAsync).toHaveBeenCalledWith(
        'git',
        ['worktree', 'remove', '--force', worktreePath],
        { cwd: '/test/repo' },
      );

      expect(mockedFs.readFile).toHaveBeenCalledWith(
        '/test/repo/.git/info/exclude',
        'utf-8',
      );
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/test/repo/.git/info/exclude',
        '\n/some/other/path\n/another/path\n',
      );
    });

    it('should do nothing if not in a git repository', async () => {
      mockedFindGitRoot.mockReturnValue(null);
      await cleanupGhostWorktree('/some/path');
      expect(mockedSpawnAsync).not.toHaveBeenCalled();
      expect(mockedFs.readFile).not.toHaveBeenCalled();
    });

    it('should log an error but not throw if worktree removal fails', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const gitError = new Error('git failed') as Error & { stderr: string };
      gitError.stderr = 'fatal: worktree remove failed';
      mockedSpawnAsync.mockRejectedValue(gitError);

      await cleanupGhostWorktree('/some/path');

      // Still tries to clean up exclude file
      expect(mockedFs.readFile).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should log an error but not throw if exclude file cleanup fails', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const fsError = new Error('Permission denied');
      mockedFs.readFile.mockRejectedValue(fsError);

      await cleanupGhostWorktree('/some/path');

      consoleErrorSpy.mockRestore();
    });
  });
});
