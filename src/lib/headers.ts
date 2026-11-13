import type { AuthConfig, BodyType, KeyValueParam } from '../types';
import { buildAuthHeader } from './auth';

/**
 * Builds the final header map for a request.
 *
 * Precedence (later wins, case-insensitive):
 *   1. Content-Type derived from the body type
 *   2. Authorization / custom auth header from the auth configuration
 *   3. User-supplied enabled headers
 *
 * Disabled rows and rows with empty keys are ignored.
 */
export function buildHeaders(
  headerRows: KeyValueParam[],
  auth: AuthConfig,
  bodyType: BodyType,
): Record<string, string> {
  const result: Record<string, string> = {};

  const put = (name: string, value: string) => {
    for (const existing of Object.keys(result)) {
      if (existing.toLowerCase() === name.toLowerCase()) {
        delete result[existing];
      }
    }
    result[name] = value;
  };

  if (bodyType === 'json') {
    put('Content-Type', 'application/json');
  } else if (bodyType === 'text') {
    put('Content-Type', 'text/plain');
  }

  const authHeader = buildAuthHeader(auth);
  if (authHeader) {
    put(authHeader.name, authHeader.value);
  }

  for (const row of headerRows) {
    if (!row.enabled) continue;
    const key = row.key.trim();
    if (!key) continue;
    put(key, row.value);
  }

  return result;
}
