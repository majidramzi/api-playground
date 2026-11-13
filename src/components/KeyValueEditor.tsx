import { Plus, Trash2 } from 'lucide-react';
import type { KeyValueParam } from '../types';
import { createEmptyParam } from '../lib/defaults';

interface KeyValueEditorProps {
  rows: KeyValueParam[];
  onChange: (rows: KeyValueParam[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
  idPrefix: string;
}

/**
 * Reusable key/value row editor used for query parameters and headers.
 * Each row can be enabled/disabled and removed individually.
 */
export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  addLabel = 'Add row',
  idPrefix,
}: KeyValueEditorProps) {
  const updateRow = (id: string, patch: Partial<KeyValueParam>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
          No rows yet. Use the button below to add one.
        </p>
      )}

      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => updateRow(row.id, { enabled: e.target.checked })}
            aria-label={`Enable row ${index + 1}`}
            className="h-4 w-4 shrink-0 cursor-pointer accent-indigo-600"
          />
          <input
            id={`${idPrefix}-key-${row.id}`}
            type="text"
            value={row.key}
            onChange={(e) => updateRow(row.id, { key: e.target.value })}
            placeholder={keyPlaceholder}
            aria-label={`${keyPlaceholder} of row ${index + 1}`}
            className="w-2/5 min-w-0 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            id={`${idPrefix}-value-${row.id}`}
            type="text"
            value={row.value}
            onChange={(e) => updateRow(row.id, { value: e.target.value })}
            placeholder={valuePlaceholder}
            aria-label={`${valuePlaceholder} of row ${index + 1}`}
            className="w-3/5 min-w-0 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            aria-label={`Remove row ${index + 1}`}
            title="Remove row"
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={() => onChange([...rows, createEmptyParam()])}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
