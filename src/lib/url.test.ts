import { describe, expect, it } from 'vitest';
import { buildUrl, isValidHttpUrl } from './url';
import { createEmptyParam } from './defaults';

describe('isValidHttpUrl', () => {
  it('accepts absolute http and https URLs', () => {
    expect(isValidHttpUrl('https://api.example.com/v1')).toBe(true);
    expect(isValidHttpUrl('http://localhost:3000/path?x=1')).toBe(true);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isValidHttpUrl('  https://api.example.com  ')).toBe(true);
  });

  it('rejects empty input', () => {
    expect(isValidHttpUrl('')).toBe(false);
    expect(isValidHttpUrl('   ')).toBe(false);
  });

  it('rejects relative URLs and bare hosts', () => {
    expect(isValidHttpUrl('/v1/users')).toBe(false);
    expect(isValidHttpUrl('api.example.com')).toBe(false);
  });

  it('rejects non-http protocols', () => {
    expect(isValidHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('data:text/html,<b>x</b>')).toBe(false);
    expect(isValidHttpUrl('ftp://example.com/file')).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isValidHttpUrl('https://')).toBe(false);
    expect(isValidHttpUrl('http://exa mple.com')).toBe(false);
  });
});

describe('buildUrl', () => {
  it('returns the base URL when there are no params', () => {
    expect(buildUrl('https://api.example.com/v1/users', [])).toBe('https://api.example.com/v1/users');
  });

  it('appends enabled query parameters', () => {
    const url = buildUrl('https://api.example.com/v1/users', [
      createEmptyParam('page', '2'),
      createEmptyParam('limit', '10'),
    ]);
    expect(url).toBe('https://api.example.com/v1/users?page=2&limit=10');
  });

  it('preserves query parameters already present in the base URL', () => {
    const url = buildUrl('https://api.example.com/search?q=hello', [createEmptyParam('page', '3')]);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('q')).toBe('hello');
    expect(parsed.searchParams.get('page')).toBe('3');
  });

  it('skips disabled rows and rows with empty keys', () => {
    const disabled = { ...createEmptyParam('off', '1'), enabled: false };
    const emptyKey = createEmptyParam('   ', 'value');
    const url = buildUrl('https://api.example.com/data', [disabled, emptyKey, createEmptyParam('ok', 'yes')]);
    expect(url).toBe('https://api.example.com/data?ok=yes');
  });

  it('URL-encodes keys and values', () => {
    const url = buildUrl('https://api.example.com/data', [createEmptyParam('search term', 'a b&c=d')]);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('search term')).toBe('a b&c=d');
  });

  it('supports repeated keys', () => {
    const url = buildUrl('https://api.example.com/data', [
      createEmptyParam('tag', 'a'),
      createEmptyParam('tag', 'b'),
    ]);
    const parsed = new URL(url);
    expect(parsed.searchParams.getAll('tag')).toEqual(['a', 'b']);
  });

  it('throws on invalid base URLs', () => {
    expect(() => buildUrl('not-a-url', [])).toThrow(/Invalid URL/);
    expect(() => buildUrl('javascript:alert(1)', [])).toThrow(/Invalid URL/);
  });
});
