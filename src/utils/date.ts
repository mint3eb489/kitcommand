/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function normalizeYear(year: string | number | undefined | null): string {
  if (!year) return '';
  const trimmed = year.toString().trim();
  if (/^\d{2}$/.test(trimmed)) {
    return '20' + trimmed;
  }
  return trimmed;
}
