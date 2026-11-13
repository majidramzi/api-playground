import type { BodyType } from '../types';

export interface BodyValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validates the request body. JSON bodies must parse successfully;
 * an empty body is always allowed (nothing will be sent).
 */
export function validateBody(bodyType: BodyType, body: string): BodyValidation {
  if (bodyType === 'none') return { valid: true };
  if (bodyType === 'text') return { valid: true };

  const trimmed = body.trim();
  if (!trimmed) return { valid: true };

  try {
    JSON.parse(trimmed);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON body',
    };
  }
}

/**
 * Pretty-prints JSON with 2-space indentation.
 * Returns the input unchanged when it is not valid JSON.
 */
export function prettyPrintJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
