/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  describe,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { TestRig } from './test-helper.js';
import { join } from 'node:path';

describe('Auto Drive /auto Command', () => {
  let rig: TestRig;

  beforeAll(() => {
    process.env['GEMINI_CLI_SETTING_experimental_autoDrive'] = 'true';
    process.env['GEMINI_API_KEY'] = 'mock-api-key-for-testing';
  });

  afterAll(() => {
    delete process.env['GEMINI_CLI_SETTING_experimental_autoDrive'];
    delete process.env['GEMINI_API_KEY'];
  });

  beforeEach(() => {
    rig = new TestRig();
  });

  afterEach(async () => {
    await rig.cleanup();
  });

  test('executes an autonomous loop with background validation', async () => {
    await rig.setup('executes an autonomous loop with background validation', {
      fakeResponsesPath: join(import.meta.dirname, 'auto-drive.responses'),
    });

    const run = await rig.runInteractive();

    // Send the auto command
    await run.sendKeys('/auto dummy');
    await run.type('\r');

    // Wait for the success output from the mocked agent
    await run.expectText('Task complete');

    await run.sendKeys('/quit');
    await run.type('\r');
  });
});
