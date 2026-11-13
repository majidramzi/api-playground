import type { AppSettings, AuthConfig, KeyValueParam, RequestConfig } from '../types';
import { generateId } from './id';

/** Default request timeout in milliseconds (0 disables the timeout). */
export const DEFAULT_TIMEOUT_MS = 30_000;

export function createEmptyParam(key = '', value = ''): KeyValueParam {
  return { id: generateId('kv'), key, value, enabled: true };
}

export function createDefaultAuth(): AuthConfig {
  return {
    type: 'none',
    token: '',
    username: '',
    password: '',
    customHeaderName: '',
    customHeaderValue: '',
  };
}

export function createDefaultConfig(): RequestConfig {
  return {
    method: 'GET',
    url: '',
    params: [createEmptyParam()],
    headers: [createEmptyParam()],
    bodyType: 'none',
    body: '',
    auth: createDefaultAuth(),
  };
}

export function createDefaultSettings(): AppSettings {
  return { theme: 'light', timeoutMs: DEFAULT_TIMEOUT_MS };
}

/** Deep-clone any JSON-serializable value (used to keep state immutable). */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
