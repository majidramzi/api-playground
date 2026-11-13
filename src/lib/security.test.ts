import { describe, expect, it } from 'vitest';
import { REDACTED, configHasSensitiveData, isSensitiveHeaderName, redactForHistory } from './security';
import { createDefaultAuth, createDefaultConfig, createEmptyParam } from './defaults';

describe('isSensitiveHeaderName', () => {
  it('flags common secret header names', () => {
    expect(isSensitiveHeaderName('Authorization')).toBe(true);
    expect(isSensitiveHeaderName('X-API-Key')).toBe(true);
    expect(isSensitiveHeaderName('api_key')).toBe(true);
    expect(isSensitiveHeaderName('X-Auth-Token')).toBe(true);
    expect(isSensitiveHeaderName('Cookie')).toBe(true);
  });

  it('does not flag ordinary headers', () => {
    expect(isSensitiveHeaderName('Accept')).toBe(false);
    expect(isSensitiveHeaderName('Content-Type')).toBe(false);
    expect(isSensitiveHeaderName('X-Request-Id')).toBe(false);
  });
});

describe('configHasSensitiveData', () => {
  it('detects bearer tokens', () => {
    const config = {
      ...createDefaultConfig(),
      auth: { ...createDefaultAuth(), type: 'bearer' as const, token: 'secret' },
    };
    expect(configHasSensitiveData(config)).toBe(true);
    expect(configHasSensitiveData(createDefaultConfig())).toBe(false);
  });

  it('detects basic credentials and custom auth values', () => {
    expect(
      configHasSensitiveData({
        ...createDefaultConfig(),
        auth: { ...createDefaultAuth(), type: 'basic' as const, username: 'user', password: 'pw' },
      }),
    ).toBe(true);
    expect(
      configHasSensitiveData({
        ...createDefaultConfig(),
        auth: { ...createDefaultAuth(), type: 'custom' as const, customHeaderValue: 'v' },
      }),
    ).toBe(true);
  });

  it('detects sensitive user headers', () => {
    const config = {
      ...createDefaultConfig(),
      headers: [createEmptyParam('X-Api-Key', 'abc')],
    };
    expect(configHasSensitiveData(config)).toBe(true);
  });
});

describe('redactForHistory', () => {
  it('removes auth secrets and redacts sensitive header values', () => {
    const config = {
      ...createDefaultConfig(),
      headers: [
        createEmptyParam('Authorization', 'Bearer abc'),
        createEmptyParam('Accept', 'application/json'),
      ],
      auth: { ...createDefaultAuth(), type: 'basic' as const, username: 'user', password: 'pw' },
    };
    const redacted = redactForHistory(config);

    expect(redacted.auth.password).toBe('');
    expect(redacted.auth.username).toBe('user'); // username alone is not a secret
    const authHeader = redacted.headers.find((h) => h.key === 'Authorization');
    expect(authHeader?.value).toBe(REDACTED);
    const acceptHeader = redacted.headers.find((h) => h.key === 'Accept');
    expect(acceptHeader?.value).toBe('application/json');
  });

  it('clears bearer tokens and custom auth values', () => {
    const config = {
      ...createDefaultConfig(),
      auth: {
        ...createDefaultAuth(),
        type: 'custom' as const,
        customHeaderName: 'X-Auth',
        customHeaderValue: 'secret-value',
      },
    };
    const redacted = redactForHistory(config);
    expect(redacted.auth.customHeaderValue).toBe('');
    expect(redacted.auth.customHeaderName).toBe('X-Auth');
  });

  it('does not mutate the input config', () => {
    const config = {
      ...createDefaultConfig(),
      auth: { ...createDefaultAuth(), type: 'bearer' as const, token: 'stay' },
    };
    redactForHistory(config);
    expect(config.auth.token).toBe('stay');
  });
});
