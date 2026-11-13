import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatDuration,
  statusCategory,
  suggestFilename,
  timeAgo,
} from './format';

describe('formatBytes', () => {
  it('formats byte counts below 1 KB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats KB, MB and GB with one decimal', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
  });

  it('handles unknown sizes', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
    expect(formatBytes(-5)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('formats sub-second durations in milliseconds', () => {
    expect(formatDuration(0)).toBe('0 ms');
    expect(formatDuration(123.4)).toBe('123 ms');
    expect(formatDuration(999)).toBe('999 ms');
  });

  it('formats durations of a second or more in seconds', () => {
    expect(formatDuration(1000)).toBe('1.00 s');
    expect(formatDuration(1500)).toBe('1.50 s');
    expect(formatDuration(12345)).toBe('12.35 s');
  });

  it('handles unknown durations', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(-1)).toBe('—');
  });
});

describe('statusCategory', () => {
  it('maps status codes to categories', () => {
    expect(statusCategory(100)).toBe('informational');
    expect(statusCategory(200)).toBe('success');
    expect(statusCategory(204)).toBe('success');
    expect(statusCategory(301)).toBe('redirect');
    expect(statusCategory(404)).toBe('client-error');
    expect(statusCategory(422)).toBe('client-error');
    expect(statusCategory(500)).toBe('server-error');
    expect(statusCategory(503)).toBe('server-error');
    expect(statusCategory(null)).toBe('unknown');
    expect(statusCategory(999)).toBe('unknown');
  });
});

describe('suggestFilename', () => {
  it('derives the extension from the content type', () => {
    expect(suggestFilename('application/json; charset=utf-8', 'https://x.com/api/users')).toBe(
      'users.json',
    );
    expect(suggestFilename('text/html', 'https://x.com/index')).toBe('index.html');
    expect(suggestFilename('text/plain', 'https://x.com/log')).toBe('log.txt');
    expect(suggestFilename('text/csv', 'https://x.com/data')).toBe('data.csv');
  });

  it('derives the base name from the last URL segment', () => {
    expect(suggestFilename(null, 'https://x.com/v1/todos/42')).toBe('42.txt');
    expect(suggestFilename(null, 'https://x.com/v1/file.json')).toBe('file.txt');
    expect(suggestFilename(null, 'https://x.com/')).toBe('response.txt');
    expect(suggestFilename(null, 'not a url')).toBe('response.txt');
  });
});

describe('timeAgo', () => {
  it('describes elapsed time in compact form', () => {
    const now = Date.now();
    expect(timeAgo(now, now)).toBe('just now');
    expect(timeAgo(now - 30_000, now)).toBe('just now');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(timeAgo(now - 3 * 3_600_000, now)).toBe('3 h ago');
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe('2 d ago');
  });
});
