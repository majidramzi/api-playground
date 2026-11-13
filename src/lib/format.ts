/** Formatting helpers for response metadata and timestamps. */

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '—';
  }
}

/** Compact relative time such as "just now", "5 min ago", "2 d ago". */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

export type StatusCategory =
  | 'informational'
  | 'success'
  | 'redirect'
  | 'client-error'
  | 'server-error'
  | 'unknown';

export function statusCategory(code: number | null | undefined): StatusCategory {
  if (code == null || Number.isNaN(code)) return 'unknown';
  if (code >= 100 && code < 200) return 'informational';
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'client-error';
  if (code >= 500 && code < 600) return 'server-error';
  return 'unknown';
}

/** Suggests a download filename based on the response content type and URL. */
export function suggestFilename(contentType: string | null, url: string): string {
  const ct = (contentType ?? '').toLowerCase();
  let ext = 'txt';
  if (ct.includes('json')) ext = 'json';
  else if (ct.includes('html')) ext = 'html';
  else if (ct.includes('xml')) ext = 'xml';
  else if (ct.includes('csv')) ext = 'csv';
  else if (ct.includes('javascript')) ext = 'js';

  let base = 'response';
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    if (segment) {
      const cleaned = segment.replace(/\.[^.]+$/, '');
      base = cleaned || 'response';
    }
  } catch {
    // Keep the default base name.
  }
  return `${base}.${ext}`;
}
