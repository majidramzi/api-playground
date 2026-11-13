import type { AppSettings, Collection, HistoryEntry } from '../types';
import { createDefaultSettings, DEFAULT_TIMEOUT_MS } from './defaults';

/**
 * Local persistence layer. Everything is stored in window.localStorage under
 * the `api-playground:` prefix and never leaves the browser.
 */

export const STORAGE_KEYS = {
  history: 'api-playground:history',
  collections: 'api-playground:collections',
  settings: 'api-playground:settings',
} as const;

export const HISTORY_LIMIT = 50;

function readJson<T>(key: string, fallback: T, validate: (value: unknown) => boolean): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or privacy mode - fail silently, the app still works in-memory.
  }
}

export function loadHistory(): HistoryEntry[] {
  return readJson<HistoryEntry[]>(STORAGE_KEYS.history, [], Array.isArray);
}

export function saveHistory(entries: HistoryEntry[]): void {
  writeJson(STORAGE_KEYS.history, entries);
}

/**
 * Pure helper: prepends a new entry and trims the list to `limit` items.
 */
export function prependHistory(
  entries: HistoryEntry[],
  entry: HistoryEntry,
  limit: number = HISTORY_LIMIT,
): HistoryEntry[] {
  return [entry, ...entries].slice(0, Math.max(0, limit));
}

export function loadCollections(): Collection[] {
  return readJson<Collection[]>(STORAGE_KEYS.collections, [], Array.isArray);
}

export function saveCollections(collections: Collection[]): void {
  writeJson(STORAGE_KEYS.collections, collections);
}

export function loadSettings(): AppSettings {
  const fallback = createDefaultSettings();
  const settings = readJson<Partial<AppSettings>>(STORAGE_KEYS.settings, fallback, (value) =>
    typeof value === 'object' && value !== null,
  );
  return {
    theme: settings.theme === 'dark' ? 'dark' : 'light',
    timeoutMs:
      typeof settings.timeoutMs === 'number' && settings.timeoutMs >= 0
        ? settings.timeoutMs
        : DEFAULT_TIMEOUT_MS,
  };
}

export function saveSettings(settings: AppSettings): void {
  writeJson(STORAGE_KEYS.settings, settings);
}
