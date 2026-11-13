import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestError, describeRequestError, executeRequest } from './http';
import { createDefaultConfig, createEmptyParam } from './defaults';
import type { RequestConfig } from '../types';

function makeConfig(overrides: Partial<RequestConfig> = {}): RequestConfig {
  return {
    ...createDefaultConfig(),
    url: 'https://api.example.com/data',
    ...overrides,
  };
}

function fakeResponse(
  body: string,
  init: { status?: number; statusText?: string; headers?: Record<string, string> } = {},
) {
  const bytes = new TextEncoder().encode(body);
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers: new Headers(init.headers ?? { 'content-type': 'application/json' }),
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  };
}

/** A fetch mock that stays pending until its signal aborts (like the real fetch). */
function pendingUntilAbort() {
  return vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (init.signal?.aborted) {
          abort();
          return;
        }
        init.signal?.addEventListener('abort', abort);
      }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('executeRequest - success path', () => {
  it('returns status, headers, body, size and timing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse('{"ok":true}', {
      status: 201,
      statusText: 'Created',
      headers: { 'content-type': 'application/json', 'x-trace': 'abc' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeRequest(makeConfig());

    expect(result.status).toBe(201);
    expect(result.statusText).toBe('Created');
    expect(result.ok).toBe(true);
    expect(result.bodyText).toBe('{"ok":true}');
    expect(result.sizeBytes).toBe(11);
    expect(result.contentType).toBe('application/json');
    expect(result.headers).toContainEqual(['x-trace', 'abc']);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('builds the URL from query parameters and sends configured headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse('{}'));
    vi.stubGlobal('fetch', fetchMock);

    const config = makeConfig({
      params: [createEmptyParam('q', 'hello world')],
      headers: [createEmptyParam('X-Test', '1')],
    });
    await executeRequest(config);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://api.example.com/data?q=hello+world');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({ 'X-Test': '1' });
  });

  it('sends the body for POST requests with a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse('{}'));
    vi.stubGlobal('fetch', fetchMock);

    const config = makeConfig({
      method: 'POST',
      bodyType: 'json',
      body: '{"a":1}',
    });
    await executeRequest(config);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('never sends a body with GET requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse('{}'));
    vi.stubGlobal('fetch', fetchMock);

    const config = makeConfig({ method: 'GET', bodyType: 'json', body: '{"a":1}' });
    await executeRequest(config);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it('returns HTTP error statuses as results instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        fakeResponse('{"error":"nope"}', { status: 404, statusText: 'Not Found' }),
      ),
    );

    const result = await executeRequest(makeConfig());
    expect(result.status).toBe(404);
    expect(result.ok).toBe(false);
  });

  it('reports size 0 for empty bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse('')));
    const result = await executeRequest(makeConfig());
    expect(result.sizeBytes).toBe(0);
    expect(result.bodyText).toBe('');
  });
});

describe('executeRequest - validation', () => {
  it('throws invalid-url without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(executeRequest(makeConfig({ url: 'not a url' }))).rejects.toMatchObject({
      kind: 'invalid-url',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws invalid-body for malformed JSON bodies', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      executeRequest(makeConfig({ method: 'POST', bodyType: 'json', body: '{bad json' })),
    ).rejects.toMatchObject({ kind: 'invalid-body' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('executeRequest - timeout', () => {
  it('aborts and throws a timeout error when the timeout elapses', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', pendingUntilAbort());

    const promise = executeRequest(makeConfig(), { timeoutMs: 1000 });
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(1100);
    await assertion;
  });

  it('does not time out when the timeout is disabled (0)', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse('{}'));
    vi.stubGlobal('fetch', fetchMock);

    const promise = executeRequest(makeConfig(), { timeoutMs: 0 });
    await vi.advanceTimersByTimeAsync(60_000);
    await expect(promise).resolves.toMatchObject({ status: 200 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('api.example.com');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('executeRequest - cancellation', () => {
  it('throws an aborted error when the external signal cancels the request', async () => {
    vi.stubGlobal('fetch', pendingUntilAbort());

    const controller = new AbortController();
    const promise = executeRequest(makeConfig(), { signal: controller.signal, timeoutMs: 0 });
    const assertion = expect(promise).rejects.toMatchObject({ kind: 'aborted' });
    controller.abort();
    await assertion;
  });

  it('throws immediately when the signal is already aborted', async () => {
    vi.stubGlobal('fetch', pendingUntilAbort());

    const controller = new AbortController();
    controller.abort();
    await expect(
      executeRequest(makeConfig(), { signal: controller.signal, timeoutMs: 0 }),
    ).rejects.toMatchObject({ kind: 'aborted' });
  });
});

describe('executeRequest - network failures', () => {
  it('maps fetch TypeErrors to network errors (usually CORS in browsers)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(executeRequest(makeConfig())).rejects.toMatchObject({ kind: 'network' });
  });

  it('maps unexpected errors to unknown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    await expect(executeRequest(makeConfig())).rejects.toMatchObject({ kind: 'unknown' });
  });
});

describe('describeRequestError', () => {
  it('mentions CORS for network errors', () => {
    const error = new RequestError('network', 'Network error or CORS restriction.');
    expect(describeRequestError(error)).toContain('CORS');
    expect(describeRequestError(error)).toContain('Access-Control-Allow-Origin');
  });

  it('explains timeouts and cancellation', () => {
    expect(describeRequestError(new RequestError('timeout', 'x'))).toContain('timed out');
    expect(describeRequestError(new RequestError('aborted', 'x'))).toContain('cancelled');
    expect(describeRequestError(new RequestError('invalid-url', 'x'))).toContain('http');
  });
});
