import { beforeEach, describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  STORAGE_KEYS,
  loadCollections,
  loadHistory,
  loadSettings,
  prependHistory,
  saveCollections,
  saveHistory,
  saveSettings,
} from './storage';
import type { Collection, HistoryEntry } from '../types';
import { createDefaultConfig } from './defaults';

function makeEntry(id: string, timestamp = Date.now()): HistoryEntry {
  return {
    id,
    timestamp,
    config: createDefaultConfig(),
    status: 200,
    statusText: 'OK',
    durationMs: 12,
    sizeBytes: 34,
    ok: true,
  };
}

describe('history persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips history through localStorage', () => {
    const entries = [makeEntry('a'), makeEntry('b')];
    saveHistory(entries);
    expect(loadHistory()).toEqual(entries);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('returns an empty list for corrupt stored data', () => {
    window.localStorage.setItem(STORAGE_KEYS.history, '{not valid json');
    expect(loadHistory()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEYS.history, '{"not":"an array"}');
    expect(loadHistory()).toEqual([]);
  });

  it('prepends new entries', () => {
    const older = makeEntry('older', 1000);
    const newer = makeEntry('newer', 2000);
    const result = prependHistory([older], newer);
    expect(result.map((e) => e.id)).toEqual(['newer', 'older']);
  });

  it('caps the history at the configured limit', () => {
    let entries: HistoryEntry[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 10; i += 1) {
      entries = prependHistory(entries, makeEntry(`e-${i}`, i));
    }
    expect(entries).toHaveLength(HISTORY_LIMIT);
    expect(entries[0].id).toBe(`e-${HISTORY_LIMIT + 9}`);
  });
});

describe('collections persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips collections through localStorage', () => {
    const collections: Collection[] = [
      {
        id: 'col-1',
        name: 'My API',
        createdAt: 1,
        updatedAt: 2,
        requests: [
          {
            id: 'req-1',
            name: 'Get users',
            createdAt: 1,
            updatedAt: 2,
            config: createDefaultConfig(),
          },
        ],
      },
    ];
    saveCollections(collections);
    expect(loadCollections()).toEqual(collections);
  });

  it('returns an empty list for corrupt stored data', () => {
    window.localStorage.setItem(STORAGE_KEYS.collections, 'oops');
    expect(loadCollections()).toEqual([]);
  });
});

describe('settings persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips settings through localStorage', () => {
    saveSettings({ theme: 'dark', timeoutMs: 5000 });
    expect(loadSettings()).toEqual({ theme: 'dark', timeoutMs: 5000 });
  });

  it('falls back to defaults for missing or invalid settings', () => {
    expect(loadSettings()).toEqual({ theme: 'light', timeoutMs: 30_000 });
    window.localStorage.setItem(STORAGE_KEYS.settings, '{"theme":"neon","timeoutMs":-3}');
    expect(loadSettings()).toEqual({ theme: 'light', timeoutMs: 30_000 });
    window.localStorage.setItem(STORAGE_KEYS.settings, 'garbage');
    expect(loadSettings()).toEqual({ theme: 'light', timeoutMs: 30_000 });
  });
});
