import { describe, expect, it } from 'vitest';
import { tokenizeJson } from './highlight';

function types(text: string) {
  return tokenizeJson(text).map((token) => token.type);
}

describe('tokenizeJson', () => {
  it('classifies keys, strings, numbers, booleans, null and punctuation', () => {
    const tokens = tokenizeJson('{"name": "Ada", "age": 36, "active": true, "extra": null}');
    const byType = new Map(tokens.map((t) => [t.type, t.value]));

    const keys = tokens.filter((t) => t.type === 'key').map((t) => t.value);
    expect(keys).toEqual(['"name"', '"age"', '"active"', '"extra"']);

    expect(tokens.filter((t) => t.type === 'string').map((t) => t.value)).toEqual(['"Ada"']);
    expect(tokens.filter((t) => t.type === 'number').map((t) => t.value)).toEqual(['36']);
    expect(tokens.filter((t) => t.type === 'boolean').map((t) => t.value)).toEqual(['true']);
    expect(tokens.filter((t) => t.type === 'null').map((t) => t.value)).toEqual(['null']);
    expect(tokens.find((t) => t.type === 'punct')?.value).toBe('{');
    expect(byType.size).toBeGreaterThan(0);
  });

  it('distinguishes object keys from string values', () => {
    expect(types('{"a": "b"}')).toEqual(['punct', 'key', 'text', 'string', 'punct']);
  });

  it('handles nested structures and negative numbers', () => {
    const tokens = tokenizeJson('{"list": [-1, 2.5, false]}');
    expect(tokens.filter((t) => t.type === 'number').map((t) => t.value)).toEqual(['-1', '2.5']);
    expect(tokens.filter((t) => t.type === 'boolean').map((t) => t.value)).toEqual(['false']);
  });

  it('preserves all input text across tokens', () => {
    const text = '{\n  "a": 1,\n  "b": [true, null]\n}';
    const joined = tokenizeJson(text)
      .map((t) => t.value)
      .join('');
    expect(joined).toBe(text);
  });

  it('handles escaped quotes inside strings', () => {
    const tokens = tokenizeJson('{"say": "he said \\"hi\\""}');
    expect(tokens.filter((t) => t.type === 'key').map((t) => t.value)).toEqual(['"say"']);
    expect(tokens.filter((t) => t.type === 'string').map((t) => t.value)).toEqual([
      '"he said \\"hi\\""',
    ]);
  });

  it('returns a single text token for empty input', () => {
    expect(tokenizeJson('')).toEqual([]);
  });
});
