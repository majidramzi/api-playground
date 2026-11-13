import type { RequestConfig } from '../types';
import { validateBody } from './body';
import { buildHeaders } from './headers';
import { buildUrl } from './url';

export type RequestErrorKind =
  | 'invalid-url'
  | 'invalid-body'
  | 'timeout'
  | 'aborted'
  | 'network'
  | 'unknown';

/** Error carrying a machine-readable kind so the UI can show tailored guidance. */
export class RequestError extends Error {
  readonly kind: RequestErrorKind;

  constructor(kind: RequestErrorKind, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'RequestError';
    this.kind = kind;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface ExecuteOptions {
  /** External signal used for manual cancellation. */
  signal?: AbortSignal;
  /** Milliseconds before the request is aborted. 0 disables the timeout. */
  timeoutMs?: number;
}

export interface ResponseResult {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  /** Response body decoded as UTF-8 text. */
  bodyText: string;
  /** Raw response bytes (used for image previews and downloads). */
  bodyBytes: Uint8Array;
  sizeBytes: number;
  contentType: string | null;
  durationMs: number;
}

/** Human-readable guidance for a failed request, including CORS caveats. */
export function describeRequestError(error: RequestError): string {
  switch (error.kind) {
    case 'invalid-url':
      return 'The URL is not valid. Enter an absolute URL starting with http:// or https://.';
    case 'invalid-body':
      return error.message;
    case 'timeout':
      return 'The request timed out before a response was received. The server may be slow or unreachable - try increasing the timeout.';
    case 'aborted':
      return 'The request was cancelled.';
    case 'network':
      return (
        'The request failed before a response was received. In browsers this is usually caused by ' +
        'CORS restrictions, an unreachable host, DNS failure or an ad-blocker. The target API must ' +
        'explicitly allow cross-origin requests from this page (Access-Control-Allow-Origin).'
      );
    default:
      return error.message || 'An unexpected error occurred while sending the request.';
  }
}

function headersToPairs(headers: Headers): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  headers.forEach((value, name) => {
    pairs.push([name, value]);
  });
  return pairs;
}

/**
 * Executes a request with the browser Fetch API.
 *
 * - Query parameters, headers and auth are applied via buildUrl/buildHeaders.
 * - Timeouts use AbortController; an external signal supports cancellation.
 * - HTTP error statuses (4xx/5xx) are returned as normal results - only
 *   transport-level failures throw.
 */
export async function executeRequest(
  config: RequestConfig,
  options: ExecuteOptions = {},
): Promise<ResponseResult> {
  const { signal, timeoutMs = 30_000 } = options;

  let url: string;
  try {
    url = buildUrl(config.url, config.params);
  } catch {
    throw new RequestError('invalid-url', 'The request URL is not a valid absolute http(s) URL.');
  }

  const validation = validateBody(config.bodyType, config.body);
  if (!validation.valid) {
    throw new RequestError('invalid-body', `Invalid JSON body: ${validation.error}`);
  }

  const headers = buildHeaders(config.headers, config.auth, config.bodyType);

  const init: RequestInit = {
    method: config.method,
    headers,
  };

  // GET requests cannot carry a body in the Fetch API.
  if (config.method !== 'GET' && config.bodyType !== 'none' && config.body.trim() !== '') {
    init.body = config.body;
  }

  const controller = new AbortController();
  let timedOut = false;

  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;

  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  init.signal = controller.signal;

  // An already-cancelled request should fail fast without touching the network.
  if (signal?.aborted) {
    if (timer !== null) clearTimeout(timer);
    throw new RequestError('aborted', 'The request was cancelled.');
  }

  const startedAt = performance.now();
  try {
    const response = await fetch(url, init);
    const buffer = await response.arrayBuffer();
    const bodyBytes = new Uint8Array(buffer);
    const bodyText = new TextDecoder('utf-8', { fatal: false }).decode(bodyBytes);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: headersToPairs(response.headers),
      bodyText,
      bodyBytes,
      sizeBytes: bodyBytes.byteLength,
      contentType: response.headers.get('content-type'),
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    if (timedOut) {
      throw new RequestError('timeout', 'The request timed out.', { cause: error });
    }
    if (signal?.aborted) {
      throw new RequestError('aborted', 'The request was cancelled.', { cause: error });
    }
    if (error instanceof RequestError) throw error;
    if (error instanceof TypeError) {
      throw new RequestError('network', 'Network error or CORS restriction.', { cause: error });
    }
    throw new RequestError('unknown', error instanceof Error ? error.message : 'Unknown error', {
      cause: error,
    });
  } finally {
    if (timer !== null) clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}
