import type { KeyValueParam } from '../types';

/**
 * Validates that `input` is an absolute, well-formed http(s) URL.
 * Relative URLs and non-http protocols (file:, javascript:, data:...) are rejected.
 */
export function isValidHttpUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Builds the final request URL by appending enabled query parameters to the
 * base URL. Existing query parameters in the base URL are preserved.
 *
 * Rows that are disabled, or whose key is empty, are skipped.
 * Values are URL-encoded via URLSearchParams.
 *
 * @throws Error if the base URL is not a valid absolute http(s) URL.
 */
export function buildUrl(baseUrl: string, params: KeyValueParam[] = []): string {
  const trimmed = baseUrl.trim();
  if (!isValidHttpUrl(trimmed)) {
    throw new Error('Invalid URL: expected an absolute http:// or https:// URL');
  }
  const url = new URL(trimmed);
  for (const param of params) {
    if (!param.enabled) continue;
    const key = param.key.trim();
    if (!key) continue;
    url.searchParams.append(key, param.value);
  }
  return url.toString();
}
