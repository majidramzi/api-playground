import { describe, expect, it } from 'vitest';
import { buildHeaders } from './headers';
import { createDefaultAuth, createEmptyParam } from './defaults';

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1];
}

describe('buildHeaders', () => {
  it('sets Content-Type to application/json for JSON bodies', () => {
    const headers = buildHeaders([], createDefaultAuth(), 'json');
    expect(headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('sets Content-Type to text/plain for text bodies', () => {
    const headers = buildHeaders([], createDefaultAuth(), 'text');
    expect(headers).toEqual({ 'Content-Type': 'text/plain' });
  });

  it('adds no Content-Type when there is no body', () => {
    const headers = buildHeaders([], createDefaultAuth(), 'none');
    expect(Object.keys(headers)).toHaveLength(0);
  });

  it('adds the authorization header from the auth configuration', () => {
    const auth = { ...createDefaultAuth(), type: 'bearer' as const, token: 'tok' };
    const headers = buildHeaders([], auth, 'none');
    expect(headerValue(headers, 'authorization')).toBe('Bearer tok');
  });

  it('lets user headers override the generated Content-Type (case-insensitive)', () => {
    const rows = [createEmptyParam('content-type', 'application/xml')];
    const headers = buildHeaders(rows, createDefaultAuth(), 'json');
    expect(headerValue(headers, 'content-type')).toBe('application/xml');
    expect(Object.keys(headers)).toHaveLength(1);
  });

  it('lets user headers override the generated authorization header', () => {
    const auth = { ...createDefaultAuth(), type: 'bearer' as const, token: 'tok' };
    const rows = [createEmptyParam('Authorization', 'Custom abc')];
    const headers = buildHeaders(rows, auth, 'none');
    expect(headerValue(headers, 'authorization')).toBe('Custom abc');
  });

  it('ignores disabled rows and rows with empty keys', () => {
    const rows = [
      { ...createEmptyParam('X-On', 'yes'), enabled: false },
      createEmptyParam('   ', 'no-key'),
      createEmptyParam('X-Kept', 'ok'),
    ];
    const headers = buildHeaders(rows, createDefaultAuth(), 'none');
    expect(headers).toEqual({ 'X-Kept': 'ok' });
  });

  it('merges defaults, auth and user headers with user values winning', () => {
    const auth = { ...createDefaultAuth(), type: 'basic' as const, username: 'u', password: 'p' };
    const rows = [createEmptyParam('Accept', 'application/json')];
    const headers = buildHeaders(rows, auth, 'json');
    expect(headerValue(headers, 'content-type')).toBe('application/json');
    expect(headerValue(headers, 'authorization')).toBe(`Basic ${utf8('u:p')}`);
    expect(headerValue(headers, 'accept')).toBe('application/json');
    expect(Object.keys(headers)).toHaveLength(3);
  });
});

function utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
