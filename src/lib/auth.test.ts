import { describe, expect, it } from 'vitest';
import { buildAuthHeader, utf8ToBase64 } from './auth';
import { createDefaultAuth } from './defaults';

describe('utf8ToBase64', () => {
  it('encodes ASCII like standard base64', () => {
    expect(utf8ToBase64('Aladdin:open sesame')).toBe('QWxhZGRpbjpvcGVuIHNlc2FtZQ==');
  });

  it('encodes non-ASCII characters as UTF-8 before base64', () => {
    // 'ü' (U+00FC) in UTF-8 is 0xC3 0xBC -> 'w7w='
    expect(utf8ToBase64('ü')).toBe('w7w=');
  });
});

describe('buildAuthHeader', () => {
  it('returns null for "none"', () => {
    expect(buildAuthHeader(createDefaultAuth())).toBeNull();
    expect(buildAuthHeader({ ...createDefaultAuth(), type: 'none', token: 'x' })).toBeNull();
  });

  it('builds a Bearer header from the token', () => {
    const header = buildAuthHeader({ ...createDefaultAuth(), type: 'bearer', token: 'abc123' });
    expect(header).toEqual({ name: 'Authorization', value: 'Bearer abc123' });
  });

  it('returns null for Bearer with an empty token', () => {
    expect(buildAuthHeader({ ...createDefaultAuth(), type: 'bearer', token: '   ' })).toBeNull();
  });

  it('builds a Basic header from username and password', () => {
    const header = buildAuthHeader({
      ...createDefaultAuth(),
      type: 'basic',
      username: 'Aladdin',
      password: 'open sesame',
    });
    expect(header).toEqual({ name: 'Authorization', value: 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==' });
  });

  it('supports passwords containing colons', () => {
    const header = buildAuthHeader({
      ...createDefaultAuth(),
      type: 'basic',
      username: 'user',
      password: 'p:ass',
    });
    expect(header?.value).toBe(`Basic ${utf8ToBase64('user:p:ass')}`);
  });

  it('returns null for Basic with both fields empty', () => {
    expect(buildAuthHeader({ ...createDefaultAuth(), type: 'basic' })).toBeNull();
  });

  it('builds a custom header', () => {
    const header = buildAuthHeader({
      ...createDefaultAuth(),
      type: 'custom',
      customHeaderName: 'X-API-Key',
      customHeaderValue: 'secret-key',
    });
    expect(header).toEqual({ name: 'X-API-Key', value: 'secret-key' });
  });

  it('returns null for custom auth with an empty header name', () => {
    expect(
      buildAuthHeader({ ...createDefaultAuth(), type: 'custom', customHeaderValue: 'v' }),
    ).toBeNull();
  });
});
