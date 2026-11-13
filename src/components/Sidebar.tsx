import { useRef, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Folder,
  Pencil,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Collection, HistoryEntry, RequestConfig, SavedRequest } from '../types';
import { timeAgo } from '../lib/format';

interface SidebarProps {
  history: HistoryEntry[];
  collections: Collection[];
  onLoadRequest: (config: RequestConfig) => void;
  onDeleteHistoryEntry: (id: string) => void;
  onClearHistory: () => void;
  onCreateCollection: (name: string) => void;
  onRenameCollection: (collectionId: string, name: string) => void;
  onDeleteCollection: (collectionId: string) => void;
  onExportCollection: (collectionId: string) => void;
  onExportAll: () => void;
  onImport: (json: string) => void;
  onRenameRequest: (collectionId: string, requestId: string, name: string) => void;
  onDuplicateRequest: (collectionId: string, requestId: string) => void;
  onDeleteRequest: (collectionId: string, requestId: string) => void;
  onClose?: () => void;
}

type SidebarTab = 'history' | 'collections';

interface RenameTarget {
  kind: 'collection' | 'request';
  collectionId: string;
  requestId?: string;
  currentName: string;
}

/** History and Collections sidebar (also used as a mobile drawer). */
export function Sidebar({
  history,
  collections,
  onLoadRequest,
  onDeleteHistoryEntry,
  onClearHistory,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onExportCollection,
  onExportAll,
  onImport,
  onRenameRequest,
  onDuplicateRequest,
  onDeleteRequest,
  onClose,
}: SidebarProps) {
  const [tab, setTab] = useState<SidebarTab>('history');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startRename = (target: RenameTarget) => {
    setRenameTarget(target);
    setRenameValue(target.currentName);
  };

  const commitRename = () => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (name) {
      if (renameTarget.kind === 'collection') {
        onRenameCollection(renameTarget.collectionId, name);
      } else if (renameTarget.requestId) {
        onRenameRequest(renameTarget.collectionId, renameTarget.requestId, name);
      }
    }
    setRenameTarget(null);
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    void file.text().then((text) => onImport(text));
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 dark:border-slate-800">
        <div className="flex">
          {(
            [
              ['history', `History (${history.length})`],
              ['collections', `Collections (${collections.length})`],
            ] as Array<[SidebarTab, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={`border-b-2 px-3 py-2.5 text-xs font-semibold ${
                tab === value
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'history' && (
          <div className="flex flex-col gap-2">
            {history.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Requests you send are recorded here automatically. Secrets such as tokens and
                passwords are redacted before being stored.
              </p>
            )}

            {history.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-start gap-2 rounded-lg border border-slate-200 p-2 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-700"
              >
                <button
                  type="button"
                  onClick={() => onLoadRequest(entry.config)}
                  title="Load into the request editor"
                  className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                >
                  <span className="flex w-full items-center gap-1.5">
                    <MethodChip method={entry.config.method} />
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        entry.ok
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {entry.status ?? 'ERR'}
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                      {timeAgo(entry.timestamp)}
                    </span>
                  </span>
                  <span
                    className="w-full truncate font-mono text-[11px] text-slate-600 dark:text-slate-300"
                    title={entry.config.url}
                  >
                    {entry.config.url || '(no URL)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteHistoryEntry(entry.id)}
                  aria-label="Delete history entry"
                  title="Delete history entry"
                  className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="mt-1 self-start text-xs font-medium text-rose-600 hover:text-rose-500 dark:text-rose-400"
              >
                Clear history
              </button>
            )}
          </div>
        )}

        {tab === 'collections' && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <SidebarToolButton
                icon={<Plus className="h-3.5 w-3.5" />}
                label="New"
                onClick={() => {
                  const name = window.prompt('Name of the new collection:');
                  if (name && name.trim()) onCreateCollection(name.trim());
                }}
              />
              <SidebarToolButton
                icon={<Upload className="h-3.5 w-3.5" />}
                label="Import"
                onClick={() => fileInputRef.current?.click()}
              />
              <SidebarToolButton
                icon={<Download className="h-3.5 w-3.5" />}
                label="Export all"
                onClick={onExportAll}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                aria-label="Import collections file"
                className="hidden"
                onChange={(e) => {
                  handleImportFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>

            {collections.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No collections yet. Save requests from the editor or create a collection above.
                Collections can be exported as JSON files.
              </p>
            )}

            {collections.map((collection) => {
              const open = expanded[collection.id] ?? true;
              return (
                <div
                  key={collection.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(collection.id)}
                      aria-expanded={open}
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                      {open ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                      <Folder className="h-4 w-4 shrink-0 text-indigo-500" />
                      <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {collection.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {collection.requests.length}
                      </span>
                    </button>
                    <RowAction
                      label="Rename collection"
                      icon={<Pencil className="h-3 w-3" />}
                      onClick={() =>
                        startRename({
                          kind: 'collection',
                          collectionId: collection.id,
                          currentName: collection.name,
                        })
                      }
                    />
                    <RowAction
                      label="Export collection"
                      icon={<Download className="h-3 w-3" />}
                      onClick={() => onExportCollection(collection.id)}
                    />
                    <RowAction
                      label="Delete collection"
                      icon={<Trash2 className="h-3 w-3" />}
                      danger
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete the collection "${collection.name}" and its ${collection.requests.length} request(s)?`,
                          )
                        ) {
                          onDeleteCollection(collection.id);
                        }
                      }}
                    />
                  </div>

                  {open && (
                    <div className="flex flex-col gap-1 border-t border-slate-100 p-1.5 dark:border-slate-800">
                      {collection.requests.length === 0 && (
                        <p className="px-2 py-1 text-[11px] text-slate-400">
                          No saved requests in this collection.
                        </p>
                      )}
                      {collection.requests.map((request) => (
                        <SavedRequestRow
                          key={request.id}
                          request={request}
                          onLoad={() => onLoadRequest(request.config)}
                          onRename={() =>
                            startRename({
                              kind: 'request',
                              collectionId: collection.id,
                              requestId: request.id,
                              currentName: request.name,
                            })
                          }
                          onDuplicate={() => onDuplicateRequest(collection.id, request.id)}
                          onDelete={() => {
                            if (window.confirm(`Delete the saved request "${request.name}"?`)) {
                              onDeleteRequest(collection.id, request.id);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline rename editor */}
      {renameTarget && (
        <div className="border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
          <label
            htmlFor="sidebar-rename-input"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Rename {renameTarget.kind}
          </label>
          <div className="flex gap-1.5">
            <input
              id="sidebar-rename-input"
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenameTarget(null);
              }}
              autoFocus
              className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={commitRename}
              className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setRenameTarget(null)}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Privacy / limitations footer */}
      <div className="border-t border-slate-200 px-3 py-2.5 text-[10px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p>
          <strong>Privacy:</strong> saved requests, history and tokens stay in this browser's local
          storage. No data is sent to any server except the APIs you call. History is capped and
          secret values are redacted before storing.
        </p>
        <p className="mt-1">
          <strong>CORS:</strong> browsers block cross-origin calls unless the API allows them. There
          is no proxy - requests go directly from your browser.
        </p>
      </div>
    </aside>
  );
}

function SidebarToolButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-300 dark:hover:text-indigo-400"
    >
      {icon}
      {label}
    </button>
  );
}

function RowAction({
  label,
  icon,
  onClick,
  danger = false,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 ${
        danger ? 'hover:text-rose-600 dark:hover:text-rose-400' : 'hover:text-indigo-600 dark:hover:text-indigo-400'
      }`}
    >
      {icon}
    </button>
  );
}

function SavedRequestRow({
  request,
  onLoad,
  onRename,
  onDuplicate,
  onDelete,
}: {
  request: SavedRequest;
  onLoad: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800">
      <button
        type="button"
        onClick={onLoad}
        title="Load into the request editor"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
          {request.name}
        </span>
        <MethodChip method={request.config.method} small />
      </button>
      <RowAction label="Load request" icon={<Send className="h-3 w-3" />} onClick={onLoad} />
      <RowAction label="Rename request" icon={<Pencil className="h-3 w-3" />} onClick={onRename} />
      <RowAction label="Duplicate request" icon={<Copy className="h-3 w-3" />} onClick={onDuplicate} />
      <RowAction label="Delete request" icon={<Trash2 className="h-3 w-3" />} danger onClick={onDelete} />
    </div>
  );
}

const METHOD_CHIP: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  POST: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  PATCH: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

function MethodChip({ method, small = false }: { method: string; small?: boolean }) {
  return (
    <span
      className={`shrink-0 rounded font-bold ${METHOD_CHIP[method] ?? 'bg-slate-100 text-slate-600'} ${
        small ? 'px-1 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]'
      }`}
    >
      {method}
    </span>
  );
}
