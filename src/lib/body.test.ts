import { describe, expect, it } from 'vitest';
import { prettyPrintJson, validateBody } from './body';

describe('validateBody', () => {
  it('accepts empty bodies of any type', () => {
    expect(validateBody('none', '')).toEqual({ valid: true });
    expect(validateBody('json', '')).toEqual({ valid: true });
    expect(validateBody('json', '   ')).toEqual({ valid: true });
    expect(validateBody('text', '')).toEqual({ valid: true });
  });

  it('accepts valid JSON', () => {
    expect(validateBody('json', '{"a": 1}')).toEqual({ valid: true });
    expect(validateBody('json', '[1, 2, 3]')).toEqual({ valid: true });
    expect(validateBody('json', '"string"')).toEqual({ valid: true });
    expect(validateBody('json', 'null')).toEqual({ valid: true });
  });

  it('rejects invalid JSON with a descriptive error', () => {
    const result = validateBody('json', '{"a": }');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects trailing commas and single quotes', () => {
    expect(validateBody('json', '{"a": 1,}').valid).toBe(false);
    expect(validateBody("json", "{'a': 1}").valid).toBe(false);
  });

  it('accepts any plain text body', () => {
    expect(validateBody('text', 'not json at all {{')).toEqual({ valid: true });
    expect(validateBody('none', '{"ignored": true}')).toEqual({ valid: true });
  });
});

describe('prettyPrintJson', () => {
  it('pretty-prints compact JSON with two-space indentation', () => {
    expect(prettyPrintJson('{"a":1,"b":[2,3]}')).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  });

  it('returns the input unchanged when it is not valid JSON', () => {
    expect(prettyPrintJson('plain text')).toBe('plain text');
    expect(prettyPrintJson('{"a": }')).toBe('{"a": }');
  });
});
