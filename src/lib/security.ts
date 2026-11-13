import type { RequestConfig } from '../types';
import { clone } from './defaults';

/** Header names whose values should never be kept in stored logs. */
const SENSITIVE_HEADER_RE =
  /(authorization|proxy-authorization|api[-_]?key|x[-_]?api[-_]?key|token|secret|cookie|password|passwd|credential)/i;

export function isSensitiveHeaderName(name: string): boolean {
  return SENSITIVE_HEADER_RE.test(name);
}

export const REDACTED = '••••••';

/**
 * True when the request carries authentication material (tokens, passwords or
 * sensitive header values) that would be written to local storage.
 */
export function configHasSensitiveData(config: RequestConfig): boolean {
  if (config.auth.type === 'bearer' && config.auth.token.trim()) return true;
  if (config.auth.type === 'basic' && (config.auth.username.trim() || config.auth.password)) {
    return true;
  }
  if (config.auth.type === 'custom' && config.auth.customHeaderValue) return true;
  return config.headers.some(
    (h) => h.enabled && h.key.trim() && isSensitiveHeaderName(h.key) && h.value,
  );
}

/**
 * Returns a copy of the request config with all secret material removed.
 * Used before writing entries into the automatic request history so that
 * tokens and passwords never end up in stored logs.
 */
export function redactForHistory(config: RequestConfig): RequestConfig {
  const copy = clone(config);
  copy.auth = { ...copy.auth, token: '', password: '', customHeaderValue: '' };
  copy.headers = copy.headers.map((h) => {
    if (h.key.trim() && isSensitiveHeaderName(h.key) && h.value) {
      return { ...h, value: REDACTED };
    }
    return h;
  });
  return copy;
}
