/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { truncateMiddle } from './string-utils.js';

describe('truncateMiddle', () => {
  it('returns original string if length is less than maxLen', () => {
    const str = 'hello world';
    expect(truncateMiddle(str, 50)).toBe(str);
  });

  it('truncates from the middle and inserts marker', () => {
    const str = 'A'.repeat(500) + 'B'.repeat(500); // 1000 chars
    const result = truncateMiddle(str, 100, 0.5);

    expect(result.length).toBe(100);
    expect(result).toMatch(/... \[\d+ characters truncated\] .../);
    expect(result.startsWith('A')).toBe(true);
    expect(result.endsWith('B')).toBe(true);
  });

  it('handles custom headRatio correctly', () => {
    const str = '1234567890'.repeat(10); // 100 chars
    const result = truncateMiddle(str, 50, 0.2);

    // 50 max length. Marker is ~ 35 chars. Remaining is 15.
    // head = 3, tail = 12.
    expect(result.length).toBe(50);
    expect(result.startsWith('123')).toBe(true);
    expect(result.endsWith('901234567890')).toBe(true);
  });

  it('handles maxLen smaller than marker', () => {
    const str = 'hello world, this is a very long string';
    const result = truncateMiddle(str, 10);
    // When maxLen is smaller than marker length, it falls back to simple head slice
    expect(result).toBe('hello worl');
    expect(result.length).toBe(10);
  });

  it('handles negative or zero maxLen', () => {
    expect(truncateMiddle('hello', 0)).toBe('');
    expect(truncateMiddle('hello', -5)).toBe('');
  });

  it('handles invalid headRatio gracefully', () => {
    const str = '1234567890'.repeat(10);
    const resultHigh = truncateMiddle(str, 50, 1.5); // clamps to 1
    const resultLow = truncateMiddle(str, 50, -0.5); // clamps to 0

    expect(resultHigh.length).toBe(50);
    expect(resultLow.length).toBe(50);
  });
});
