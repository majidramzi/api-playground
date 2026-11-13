import { useMemo, type ReactNode } from 'react';
import { Bookmark, Loader2, Send, XCircle } from 'lucide-react';
import type { HttpMethod, RequestConfig } from '../types';
import { HTTP_METHODS } from '../types';
import { isValidHttpUrl } from '../lib/url';
import { validateBody } from '../lib/body';
import { AuthPanel } from './AuthPanel';
import { BodyPanel } from './BodyPanel';
import { KeyValueEditor } from './KeyValueEditor';

export type RequestTab = 'params' | 'headers' | 'body' | 'auth';

interface RequestBuilderProps {
  config: RequestConfig;
  sending: boolean;
  dark: boolean;
  timeoutMs: number;
  activeTab: RequestTab;
  onTabChange: (tab: RequestTab) => void;
  onConfigChange: (patch: Partial<RequestConfig>) => void;
  onSend: () => void;
  onCancel: () => void;
  onSave: () => void;
  onTimeoutChange: (timeoutMs: number) => void;
}

const METHOD_TEXT: Record<HttpMethod, string> = {
  GET: 'text-emerald-600 dark:text-emerald-400',
  POST: 'text-sky-600 dark:text-sky-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  PATCH: 'text-violet-600 dark:text-violet-400',
  DELETE: 'text-rose-600 dark:text-rose-400',
};

const TABS: Array<{ value: RequestTab; label: string }> = [
  { value: 'params', label: 'Params' },
  { value: 'headers', label: 'Headers' },
  { value: 'body', label: 'Body' },
  { value: 'auth', label: 'Authorization' },
];

const TIMEOUT_OPTIONS = [5_000, 10_000, 30_000, 60_000, 0];

function countActive(rows: Array<{ enabled: boolean; key: string }>): number {
  return rows.filter((row) => row.enabled && row.key.trim()).length;
}

/** The request editor: method + URL bar and Params/Headers/Body/Auth tabs. */
export function RequestBuilder({
  config,
  sending,
  dark,
  timeoutMs,
  activeTab,
  onTabChange,
  onConfigChange,
  onSend,
  onCancel,
  onSave,
  onTimeoutChange,
}: RequestBuilderProps) {
  const urlError =
    config.url.trim() !== '' && !isValidHttpUrl(config.url)
      ? 'Enter an absolute URL starting with http:// or https://'
      : null;

  const bodyError = useMemo(() => {
    if (activeTab !== 'body') return null;
    const validation = validateBody(config.bodyType, config.body);
    return validation.valid ? null : validation.error ?? null;
  }, [activeTab, config.bodyType, config.body]);

  const paramCount = countActive(config.params);
  const headerCount = countActive(config.headers);
  const authActive = config.auth.type !== 'none';

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* URL bar */}
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="http-method" className="sr-only">
            HTTP method
          </label>
          <select
            id="http-method"
            value={config.method}
            onChange={(e) => onConfigChange({ method: e.target.value as HttpMethod })}
            aria-label="HTTP method"
            className={`rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-bold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 ${METHOD_TEXT[config.method]}`}
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method} className="font-semibold text-slate-900">
                {method}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1">
          <label htmlFor="request-url" className="sr-only">
            Request URL
          </label>
          <input
            id="request-url"
            type="text"
            value={config.url}
            onChange={(e) => onConfigChange({ url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !sending) onSend();
            }}
            placeholder="https://api.example.com/v1/resource"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={urlError !== null}
            className={`w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 dark:bg-slate-800 dark:text-slate-100 ${
              urlError
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-600'
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            title="Save to a collection"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {sending ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={config.url.trim() === ''}
              title="Send request (Ctrl+Enter)"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </button>
          )}
        </div>
      </div>

      {urlError && (
        <p role="alert" className="px-3 pb-2 text-xs text-rose-600 dark:text-rose-400">
          {urlError}
        </p>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 dark:border-slate-800">
        <div role="tablist" aria-label="Request configuration" className="flex flex-wrap">
          {TABS.map((tab) => {
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.value)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
                {tab.value === 'params' && paramCount > 0 && <TabBadge>{paramCount}</TabBadge>}
                {tab.value === 'headers' && headerCount > 0 && <TabBadge>{headerCount}</TabBadge>}
                {tab.value === 'body' && config.bodyType !== 'none' && <TabBadge>1</TabBadge>}
                {tab.value === 'auth' && authActive && <TabBadge>on</TabBadge>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 py-1 text-xs text-slate-500 dark:text-slate-400">
          <label htmlFor="timeout-select">Timeout</label>
          <select
            id="timeout-select"
            value={timeoutMs}
            onChange={(e) => onTimeoutChange(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {TIMEOUT_OPTIONS.map((ms) => (
              <option key={ms} value={ms}>
                {ms === 0 ? 'Off' : `${ms / 1000}s`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'params' && (
          <KeyValueEditor
            idPrefix="param"
            rows={config.params}
            onChange={(params) => onConfigChange({ params })}
            keyPlaceholder="Parameter name"
            valuePlaceholder="Value"
            addLabel="Add parameter"
          />
        )}
        {activeTab === 'headers' && (
          <KeyValueEditor
            idPrefix="header"
            rows={config.headers}
            onChange={(headers) => onConfigChange({ headers })}
            keyPlaceholder="Header name"
            valuePlaceholder="Value"
            addLabel="Add header"
          />
        )}
        {activeTab === 'body' && (
          <BodyPanel
            method={config.method}
            bodyType={config.bodyType}
            body={config.body}
            dark={dark}
            onBodyTypeChange={(bodyType) => onConfigChange({ bodyType })}
            onBodyChange={(body) => onConfigChange({ body })}
          />
        )}
        {activeTab === 'auth' && (
          <AuthPanel auth={config.auth} onChange={(auth) => onConfigChange({ auth })} />
        )}

        {bodyError && activeTab === 'body' && (
          <p className="sr-only" role="alert">
            {bodyError}
          </p>
        )}
      </div>
    </section>
  );
}

function TabBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
      {children}
    </span>
  );
}
