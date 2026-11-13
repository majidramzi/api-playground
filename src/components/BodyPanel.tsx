import { lazy, Suspense } from 'react';
import { Wand2 } from 'lucide-react';
import type { BodyType, HttpMethod } from '../types';
import { prettyPrintJson, validateBody } from '../lib/body';

// CodeMirror is the heaviest dependency - load it only when a body is edited.
const CodeEditor = lazy(() => import('./CodeEditor').then((m) => ({ default: m.CodeEditor })));

interface BodyPanelProps {
  method: HttpMethod;
  bodyType: BodyType;
  body: string;
  dark: boolean;
  onBodyTypeChange: (bodyType: BodyType) => void;
  onBodyChange: (body: string) => void;
}

const BODY_TYPES: Array<{ value: BodyType; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'text', label: 'Text' },
];

export function BodyPanel({
  method,
  bodyType,
  body,
  dark,
  onBodyTypeChange,
  onBodyChange,
}: BodyPanelProps) {
  const validation = bodyType === 'json' ? validateBody('json', body) : { valid: true };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label="Body type"
          className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-600"
        >
          {BODY_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={bodyType === option.value}
              onClick={() => onBodyTypeChange(option.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                bodyType === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {bodyType === 'json' && body.trim() !== '' && (
          <button
            type="button"
            onClick={() => onBodyChange(prettyPrintJson(body))}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Beautify
          </button>
        )}
      </div>

      {method === 'GET' && bodyType !== 'none' && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Browsers do not allow sending a request body with GET. The body will be ignored.
        </p>
      )}

      {bodyType === 'none' && (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          This request has no body. Select <strong>JSON</strong> or <strong>Text</strong> to add one.
        </p>
      )}

      {bodyType !== 'none' && (
        <>
          <Suspense
            fallback={
              <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">
                Loading editor…
              </div>
            }
          >
            <CodeEditor
              value={body}
              onChange={onBodyChange}
              language={bodyType === 'json' ? 'json' : 'text'}
              dark={dark}
              placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Plain text body...'}
              height="220px"
            />
          </Suspense>
          {bodyType === 'json' && !validation.valid && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            >
              Invalid JSON: {validation.error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
