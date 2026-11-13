import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Copy,
  Database,
  Download,
  FileText,
  Globe,
  Info,
  Loader2,
  Terminal,
} from 'lucide-react';
import type { RequestError, ResponseResult } from '../lib/http';
import { describeRequestError } from '../lib/http';
import { prettyPrintJson } from '../lib/body';
import { formatBytes, formatDuration, statusCategory, suggestFilename } from '../lib/format';
import { tokenizeJson, type JsonTokenType } from '../lib/highlight';
import { sanitizeHtml } from '../lib/sanitize';

interface ResponseViewerProps {
  response: ResponseResult | null;
  error: RequestError | null;
  sending: boolean;
  requestUrl: string;
  onNotify: (message: string) => void;
}

type TopTab = 'body' | 'headers';
type BodyView = 'pretty' | 'raw' | 'preview';

const STATUS_STYLES: Record<string, string> = {
  informational: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  redirect: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  'client-error': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  'server-error': 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  unknown: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const TOKEN_CLASS: Record<JsonTokenType, string> = {
  key: 'json-key',
  string: 'json-string',
  number: 'json-number',
  boolean: 'json-boolean',
  null: 'json-null',
  punct: 'json-punct',
  text: '',
};

/** Displays status metadata, headers, and the body in Pretty/Raw/Preview views. */
export function ResponseViewer({ response, error, sending, requestUrl, onNotify }: ResponseViewerProps) {
  const [topTab, setTopTab] = useState<TopTab>('body');
  const [bodyView, setBodyView] = useState<BodyView>('pretty');

  const copyBody = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response.bodyText);
      onNotify('Response copied to clipboard.');
    } catch {
      onNotify('Could not access the clipboard.');
    }
  };

  const downloadBody = () => {
    if (!response) return;
    const blob = new Blob([response.bodyBytes as unknown as BlobPart], {
      type: response.contentType ?? 'text/plain',
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = suggestFilename(response.contentType, requestUrl);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    onNotify('Response downloaded.');
  };

  return (
    <section className="flex min-h-64 flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Response</h2>
        {response && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyBody}
              title="Copy response body"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-300 dark:hover:text-indigo-400"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              type="button"
              onClick={downloadBody}
              title="Download response body"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-300 dark:hover:text-indigo-400"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        )}
      </div>

      {sending && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">Sending request…</p>
        </div>
      )}

      {!sending && !response && !error && <EmptyState />}

      {!sending && error && <ErrorState error={error} />}

      {!sending && response && (
        <>
          {/* Status bar */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[statusCategory(response.status)]}`}
            >
              <Globe className="h-3.5 w-3.5" />
              {response.status}
              {response.statusText ? ` ${response.statusText}` : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(response.durationMs)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Database className="h-3.5 w-3.5" />
              {formatBytes(response.sizeBytes)}
            </span>
            {response.contentType && (
              <span className="truncate text-xs text-slate-400 dark:text-slate-500" title={response.contentType}>
                {response.contentType}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-4 py-1.5 dark:border-slate-800">
            {(
              [
                ['body', 'Body'],
                ['headers', `Headers (${response.headers.length})`],
              ] as Array<[TopTab, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTopTab(value)}
                aria-pressed={topTab === value}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  topTab === value
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}

            {topTab === 'body' && (
              <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                {(
                  [
                    ['pretty', 'Pretty'],
                    ['raw', 'Raw'],
                    ['preview', 'Preview'],
                  ] as Array<[BodyView, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBodyView(value)}
                    aria-pressed={bodyView === value}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      bodyView === value
                        ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {topTab === 'headers' && <HeadersTable headers={response.headers} />}
            {topTab === 'body' && bodyView === 'pretty' && (
              <PrettyBody text={response.bodyText} contentType={response.contentType} />
            )}
            {topTab === 'body' && bodyView === 'raw' && (
              <pre className="whitespace-pre-wrap break-all font-mono text-xs text-slate-800 dark:text-slate-200">
                {response.bodyText || '(empty response body)'}
              </pre>
            )}
            {topTab === 'body' && bodyView === 'preview' && (
              <PreviewBody response={response} />
            )}
          </div>
        </>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="rounded-2xl bg-slate-100 p-4 text-slate-400 dark:bg-slate-800">
        <Terminal className="h-8 w-8" />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        Send a request to see the response here
      </p>
      <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
        Requests run directly in your browser with the Fetch API. If a request fails with a network
        or CORS error, the target API must allow cross-origin calls from this page.
      </p>
    </div>
  );
}

function ErrorState({ error }: { error: RequestError }) {
  const titleMap: Record<string, string> = {
    'invalid-url': 'Invalid URL',
    'invalid-body': 'Invalid request body',
    timeout: 'Request timed out',
    aborted: 'Request cancelled',
    network: 'Network or CORS error',
    unknown: 'Request failed',
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="rounded-2xl bg-rose-50 p-4 text-rose-500 dark:bg-rose-950/50">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
        {titleMap[error.kind] ?? 'Request failed'}
      </p>
      <p className="max-w-lg text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        {describeRequestError(error)}
      </p>
      {error.kind === 'network' && (
        <div className="mt-1 max-w-lg rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          <p className="mb-1 flex items-center gap-1.5 font-medium">
            <Info className="h-3.5 w-3.5" />
            About browser limitations
          </p>
          <ul className="ml-4 list-disc space-y-0.5">
            <li>Browsers enforce Cross-Origin Resource Sharing (CORS) rules for every request.</li>
            <li>
              The API must respond with <code>Access-Control-Allow-Origin</code> covering this page.
            </li>
            <li>No proxy is used - requests go only from your browser to the URL you entered.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function HeadersTable({ headers }: { headers: Array<[string, string]> }) {
  if (headers.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No response headers.</p>;
  }
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <th className="w-1/3 py-1.5 pr-4 font-semibold">Header</th>
          <th className="py-1.5 font-semibold">Value</th>
        </tr>
      </thead>
      <tbody>
        {headers.map(([name, value], index) => (
          <tr
            key={`${name}-${index}`}
            className="border-b border-slate-100 align-top dark:border-slate-800"
          >
            <td className="py-1.5 pr-4 font-mono font-medium text-slate-700 dark:text-slate-300">
              {name}
            </td>
            <td className="break-all py-1.5 font-mono text-slate-600 dark:text-slate-400">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrettyBody({ text, contentType }: { text: string; contentType: string | null }) {
  const isJson = (contentType ?? '').toLowerCase().includes('json');
  const { pretty, tokens, parsed } = useMemo(() => {
    const candidate = isJson ? prettyPrintJson(text) : text;
    let didParse = false;
    if (text.trim()) {
      try {
        JSON.parse(text);
        didParse = true;
      } catch {
        didParse = false;
      }
    }
    return {
      pretty: candidate,
      tokens: didParse ? tokenizeJson(prettyPrintJson(text)) : null,
      parsed: didParse,
    };
  }, [text, isJson]);

  if (!text.trim()) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">(empty response body)</p>;
  }

  if (!parsed) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <FileText className="h-3.5 w-3.5" />
          The response is not valid JSON - showing it as plain text.
        </p>
        <pre className="whitespace-pre-wrap break-all font-mono text-xs text-slate-800 dark:text-slate-200">
          {pretty}
        </pre>
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200">
      <code>
        {tokens?.map((token, index) => (
          <span key={index} className={TOKEN_CLASS[token.type]}>
            {token.value}
          </span>
        ))}
      </code>
    </pre>
  );
}

function PreviewBody({ response }: { response: ResponseResult }) {
  const ct = (response.contentType ?? '').toLowerCase();

  const imageUrl = useMemo(() => {
    if (!ct.startsWith('image/')) return null;
    const blob = new Blob([response.bodyBytes as unknown as BlobPart], {
      type: response.contentType ?? 'image/png',
    });
    return URL.createObjectURL(blob);
  }, [ct, response.bodyBytes, response.contentType]);

  // Revoke the object URL when the component unmounts or the URL changes.
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  if (ct.includes('html')) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Info className="h-3.5 w-3.5" />
          Sanitized preview - scripts, event handlers and embedded frames are removed and cannot run.
        </p>
        <iframe
          title="Sanitized response preview"
          sandbox=""
          srcDoc={sanitizeHtml(response.bodyText)}
          className="h-96 w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700"
        />
      </div>
    );
  }

  if (ct.startsWith('image/') && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Response preview"
        className="mx-auto max-h-96 rounded-lg border border-slate-200 dark:border-slate-700"
      />
    );
  }

  if (ct.includes('json')) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">Structured JSON preview.</p>
        <PrettyBody text={response.bodyText} contentType={response.contentType} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        No visual preview for this content type - showing the raw text.
      </p>
      <pre className="whitespace-pre-wrap break-all font-mono text-xs text-slate-800 dark:text-slate-200">
        {response.bodyText || '(empty response body)'}
      </pre>
    </div>
  );
}


