/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Truncates a string from the middle if it exceeds maxLen, inserting a marker.
 * Retains headRatio of the length at the beginning and the rest at the end.
 *
 * @param str The string to truncate.
 * @param maxLen Maximum allowed length (default 5000).
 * @param headRatio Ratio of retained text to keep at the start (default 0.3 = 30%).
 * @returns The truncated string.
 */
export function truncateMiddle(
  str: string,
  maxLen = 5000,
  headRatio = 0.3,
): string {
  if (typeof str !== 'string') return str;
  if (maxLen <= 0) return '';
  if (str.length <= maxLen) return str;

  const safeRatio = Math.max(0, Math.min(1, headRatio));

  // Estimate removed chars for the marker
  const removedChars = str.length - maxLen;
  const marker = `\n... [${String(removedChars)} characters truncated] ...\n`;
  const markerLen = marker.length;

  // If the max length is smaller than our marker, just do a simple head slice
  if (maxLen <= markerLen) {
    return str.substring(0, maxLen);
  }

  const remainingLen = maxLen - markerLen;
  const headLen = Math.floor(remainingLen * safeRatio);
  const tailLen = remainingLen - headLen;

  return (
    str.substring(0, headLen) + marker + str.substring(str.length - tailLen)
  );
}
