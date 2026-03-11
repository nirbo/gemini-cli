/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnAsync } from './shell-utils.js';
import { findGitRoot } from './gitUtils.js';
import { randomBytes } from 'node:crypto';

/**
 * Creates a temporary "ghost" git worktree.
 *
 * @param commitHash Optional commit hash to check out. If not provided, HEAD is used.
 * @returns The absolute path to the new worktree.
 */
export async function createGhostWorktree(
  commitHash?: string,
): Promise<string> {
  const gitRoot = findGitRoot(process.cwd());
  if (!gitRoot) {
    throw new Error('Not in a git repository.');
  }

  const worktreeName = `gemini-ghost-worktree-${randomBytes(8).toString('hex')}`;
  const worktreePath = path.join(os.tmpdir(), worktreeName);

  const args = ['worktree', 'add', '--detach', worktreePath];
  if (commitHash) {
    args.push(commitHash);
  }

  try {
    await spawnAsync('git', args, { cwd: gitRoot });
  } catch (e) {
    if (e instanceof Error) {
      const error = e as Error & { stderr?: string };
      throw new Error(
        `Failed to create worktree: ${error.message}\n${error.stderr ?? ''}`,
      );
    }
    throw new Error(`Failed to create worktree: ${String(e)}`);
  }

  const excludePath = path.join(gitRoot, '.git', 'info', 'exclude');
  await fs.appendFile(excludePath, `\n${worktreePath}\n`);

  return worktreePath;
}

/**
 * Cleans up a ghost worktree.
 *
 * @param worktreePath The path to the worktree to be removed.
 */
export async function cleanupGhostWorktree(
  worktreePath: string,
): Promise<void> {
  const gitRoot = findGitRoot(process.cwd());
  if (!gitRoot) {
    // Not in a git repo, or something is very wrong. Nothing to do.
    return;
  }

  try {
    await spawnAsync('git', ['worktree', 'remove', '--force', worktreePath], {
      cwd: gitRoot,
    });
  } catch (_e) {
    // Don't throw here, as we want to continue to the exclude file cleanup.
    // The worktree might already be gone.
  }

  const excludePath = path.join(gitRoot, '.git', 'info', 'exclude');
  try {
    const excludeContent = await fs.readFile(excludePath, 'utf-8');
    const lines = excludeContent.split('\n');
    const newLines = lines.filter(
      (line) => line.trim() !== worktreePath.trim(),
    );
    await fs.writeFile(excludePath, newLines.join('\n'));
  } catch (_e) {
    // If the exclude file doesn't exist or we can't write to it, there's not much we can do.
  }
}
