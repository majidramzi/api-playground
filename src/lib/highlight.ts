/**
 * A tiny, dependency-free JSON tokenizer used for syntax highlighting in the
 * response viewer. It only classifies tokens - it never evaluates anything.
 */

export type JsonTokenType =
  | 'key'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'punct'
  | 'text';

export interface JsonToken {
  type: JsonTokenType;
  value: string;
}

const TOKEN_RE =
  /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b|([{}[\],])/g;

export function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let lastIndex = 0;

  const push = (type: JsonTokenType, value: string) => {
    const last = tokens[tokens.length - 1];
    if (type === 'text' && last !== undefined && last.type === 'text') {
      last.value += value;
      return;
    }
    tokens.push({ type, value });
  };

  for (const match of text.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      push('text', text.slice(lastIndex, index));
    }

    const [, str, colon, number, bool, nil, punct] = match;
    if (str !== undefined) {
      if (colon !== undefined) {
        push('key', str);
        push('text', colon);
      } else {
        push('string', str);
      }
    } else if (number !== undefined) {
      push('number', number);
    } else if (bool !== undefined) {
      push('boolean', bool);
    } else if (nil !== undefined) {
      push('null', nil);
    } else if (punct !== undefined) {
      push('punct', punct);
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    push('text', text.slice(lastIndex));
  }
  return tokens;
}
