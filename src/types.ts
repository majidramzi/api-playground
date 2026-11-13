/** Core domain types for API Playground. */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** A single row in the Params or Headers editor. */
export interface KeyValueParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'custom';

export interface AuthConfig {
  type: AuthType;
  /** Bearer token (auth.type === 'bearer'). */
  token: string;
  /** Basic auth username. */
  username: string;
  /** Basic auth password. */
  password: string;
  /** Custom authorization header name (auth.type === 'custom'). */
  customHeaderName: string;
  /** Custom authorization header value (auth.type === 'custom'). */
  customHeaderValue: string;
}

export type BodyType = 'none' | 'json' | 'text';

/** Everything needed to describe a request the user has built. */
export interface RequestConfig {
  method: HttpMethod;
  url: string;
  params: KeyValueParam[];
  headers: KeyValueParam[];
  bodyType: BodyType;
  body: string;
  auth: AuthConfig;
}

/** A request saved into a collection. */
export interface SavedRequest {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: RequestConfig;
}

/** A named group of saved requests. */
export interface Collection {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  requests: SavedRequest[];
}

/** An automatically recorded past request (secrets are redacted). */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  config: RequestConfig;
  status: number | null;
  statusText: string;
  durationMs: number | null;
  sizeBytes: number | null;
  ok: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  timeoutMs: number;
}
