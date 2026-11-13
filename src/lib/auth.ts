import type { AuthConfig } from '../types';

export interface AuthHeader {
  name: string;
  value: string;
}

/**
 * UTF-8 safe base64 encoding (window.btoa alone breaks on non-Latin1 input).
 */
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Produces the authorization header for the given auth configuration.
 * Returns `null` when no header should be sent (auth disabled, or required
 * fields are empty).
 */
export function buildAuthHeader(auth: AuthConfig): AuthHeader | null {
  switch (auth.type) {
    case 'none':
      return null;
    case 'bearer': {
      const token = auth.token.trim();
      if (!token) return null;
      return { name: 'Authorization', value: `Bearer ${token}` };
    }
    case 'basic': {
      const username = auth.username.trim();
      const password = auth.password;
      if (!username && !password) return null;
      return { name: 'Authorization', value: `Basic ${utf8ToBase64(`${username}:${password}`)}` };
    }
    case 'custom': {
      const name = auth.customHeaderName.trim();
      if (!name) return null;
      return { name, value: auth.customHeaderValue };
    }
    default:
      return null;
  }
}
