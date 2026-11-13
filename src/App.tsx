import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Code2,
  Moon,
  PanelLeft,
  Sun,
  Zap,
} from 'lucide-react';
import type {
  AppSettings,
  Collection,
  HistoryEntry,
  RequestConfig,
  SavedRequest,
} from './types';
import { createDefaultConfig, clone } from './lib/defaults';
import { generateId } from './lib/id';
import { isValidHttpUrl } from './lib/url';
import { RequestError, executeRequest, type ResponseResult } from './lib/http';
import { configHasSensitiveData, redactForHistory } from './lib/security';
import {
  HISTORY_LIMIT,
  loadCollections,
  loadHistory,
  loadSettings,
  prependHistory,
  saveCollections,
  saveHistory,
  saveSettings,
} from './lib/storage';
import { parseCollectionsFile, serializeCollections } from './lib/collectionFile';
import { RequestBuilder, type RequestTab } from './components/RequestBuilder';
import { ResponseViewer } from './components/ResponseViewer';
import { Sidebar } from './components/Sidebar';
import { SaveRequestModal } from './components/SaveRequestModal';
import { Toast } from './components/Toast';

const REPO_URL = 'https://github.com/majidramzi/api-playground';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [config, setConfig] = useState<RequestConfig>(createDefaultConfig);
  const [response, setResponse] = useState<ResponseResult | null>(null);
  const [error, setError] = useState<RequestError | null>(null);
  const [sending, setSending] = useState(false);
  const [requestTab, setRequestTab] = useState<RequestTab>('params');
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [collections, setCollections] = useState<Collection[]>(() => loadCollections());
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<{ collectionId: string; requestId: string } | null>(
    null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dark = settings.theme === 'dark';

  // Apply the theme to <html> and persist settings.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    saveSettings(settings);
  }, [settings, dark]);

  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);

  const updateConfig = useCallback((patch: Partial<RequestConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // ---- Sending -------------------------------------------------------------

  const recordHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const next = prependHistory(prev, entry, HISTORY_LIMIT);
      saveHistory(next);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (sending) return;
    if (!isValidHttpUrl(config.url)) {
      setResponse(null);
      setError(new RequestError('invalid-url', 'The request URL is not a valid absolute http(s) URL.'));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);
    setError(null);
    setResponse(null);

    try {
      const result = await executeRequest(config, {
        signal: controller.signal,
        timeoutMs: settings.timeoutMs,
      });
      setResponse(result);
      recordHistory({
        id: generateId('hist'),
        timestamp: Date.now(),
        config: redactForHistory(config),
        status: result.status,
        statusText: result.statusText,
        durationMs: result.durationMs,
        sizeBytes: result.sizeBytes,
        ok: result.ok,
      });
    } catch (err) {
      const requestError =
        err instanceof RequestError ? err : new RequestError('unknown', 'Unexpected error');
      setError(requestError);
      setResponse(null);
      if (requestError.kind !== 'aborted') {
        recordHistory({
          id: generateId('hist'),
          timestamp: Date.now(),
          config: redactForHistory(config),
          status: null,
          statusText: requestError.kind,
          durationMs: null,
          sizeBytes: null,
          ok: false,
        });
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [config, sending, settings.timeoutMs, recordHistory]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Ctrl/Cmd + Enter sends the request from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSend();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSend]);

  // ---- Loading requests ----------------------------------------------------

  const loadIntoEditor = useCallback((next: RequestConfig) => {
    setConfig(clone(next));
    setResponse(null);
    setError(null);
    setSidebarOpen(false);
  }, []);

  // ---- History -------------------------------------------------------------

  const handleDeleteHistoryEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    if (!window.confirm('Clear all recorded history?')) return;
    setHistory([]);
    saveHistory([]);
  }, []);

  // ---- Collections ---------------------------------------------------------

  const persistCollections = useCallback((updater: (prev: Collection[]) => Collection[]) => {
    setCollections((prev) => {
      const next = updater(prev);
      saveCollections(next);
      return next;
    });
  }, []);

  const handleCreateCollection = useCallback(
    (name: string) => {
      persistCollections((prev) => [
        ...prev,
        {
          id: generateId('col'),
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          requests: [],
        },
      ]);
      notify(`Collection "${name}" created.`);
    },
    [persistCollections, notify],
  );

  const handleSaveRequest = useCallback(
    (name: string, collectionId: string | 'new', newCollectionName: string) => {
      const saved: SavedRequest = {
        id: generateId('req'),
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: clone(config),
      };
      persistCollections((prev) => {
        if (collectionId === 'new') {
          return [
            ...prev,
            {
              id: generateId('col'),
              name: newCollectionName,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              requests: [saved],
            },
          ];
        }
        return prev.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                updatedAt: Date.now(),
                requests: [...collection.requests, saved],
              }
            : collection,
        );
      });
      notify('Request saved to your collection.');
    },
    [config, persistCollections, notify],
  );

  const handleUpdateSavedRequest = useCallback(() => {
    if (!updateTarget) return;
    persistCollections((prev) =>
      prev.map((collection) =>
        collection.id === updateTarget.collectionId
          ? {
              ...collection,
              updatedAt: Date.now(),
              requests: collection.requests.map((request) =>
                request.id === updateTarget.requestId
                  ? { ...request, config: clone(config), updatedAt: Date.now() }
                  : request,
              ),
            }
          : collection,
      ),
    );
    notify('Saved request updated.');
  }, [updateTarget, config, persistCollections, notify]);

  const handleRenameCollection = useCallback(
    (collectionId: string, name: string) => {
      persistCollections((prev) =>
        prev.map((collection) =>
          collection.id === collectionId ? { ...collection, name, updatedAt: Date.now() } : collection,
        ),
      );
    },
    [persistCollections],
  );

  const handleDeleteCollection = useCallback(
    (collectionId: string) => {
      persistCollections((prev) => prev.filter((collection) => collection.id !== collectionId));
      if (updateTarget?.collectionId === collectionId) setUpdateTarget(null);
      notify('Collection deleted.');
    },
    [persistCollections, notify, updateTarget],
  );

  const handleRenameRequest = useCallback(
    (collectionId: string, requestId: string, name: string) => {
      persistCollections((prev) =>
        prev.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                updatedAt: Date.now(),
                requests: collection.requests.map((request) =>
                  request.id === requestId ? { ...request, name, updatedAt: Date.now() } : request,
                ),
              }
            : collection,
        ),
      );
    },
    [persistCollections],
  );

  const handleDuplicateRequest = useCallback(
    (collectionId: string, requestId: string) => {
      persistCollections((prev) =>
        prev.map((collection) => {
          if (collection.id !== collectionId) return collection;
          const source = collection.requests.find((request) => request.id === requestId);
          if (!source) return collection;
          const duplicate: SavedRequest = {
            ...clone(source),
            id: generateId('req'),
            name: `${source.name} (copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return { ...collection, updatedAt: Date.now(), requests: [...collection.requests, duplicate] };
        }),
      );
      notify('Request duplicated.');
    },
    [persistCollections, notify],
  );

  const handleDeleteRequest = useCallback(
    (collectionId: string, requestId: string) => {
      persistCollections((prev) =>
        prev.map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                updatedAt: Date.now(),
                requests: collection.requests.filter((request) => request.id !== requestId),
              }
            : collection,
        ),
      );
      if (updateTarget?.requestId === requestId) setUpdateTarget(null);
      notify('Request deleted.');
    },
    [persistCollections, notify, updateTarget],
  );

  // ---- Export / import -----------------------------------------------------

  const downloadJson = useCallback((json: string, filename: string) => {
    const blob = new Blob([json], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }, []);

  const handleExportCollection = useCallback(
    (collectionId: string) => {
      const collection = collections.find((item) => item.id === collectionId);
      if (!collection) return;
      downloadJson(serializeCollections([collection]), `${collection.name.replace(/\s+/g, '-').toLowerCase()}.json`);
      notify('Collection exported.');
    },
    [collections, downloadJson, notify],
  );

  const handleExportAll = useCallback(() => {
    if (collections.length === 0) {
      notify('There are no collections to export.');
      return;
    }
    downloadJson(serializeCollections(collections), 'api-playground-collections.json');
    notify('All collections exported.');
  }, [collections, downloadJson, notify]);

  const handleImport = useCallback(
    (json: string) => {
      try {
        const imported = parseCollectionsFile(json);
        persistCollections((prev) => [...prev, ...imported]);
        notify(
          `Imported ${imported.length} collection${imported.length === 1 ? '' : 's'}.`,
        );
      } catch (err) {
        notify(`Import failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    },
    [persistCollections, notify],
  );

  // ---- Save modal ----------------------------------------------------------

  const openSaveModal = useCallback(() => {
    setSaveModalOpen(true);
  }, []);

  const closeSaveModal = useCallback(() => {
    setSaveModalOpen(false);
  }, []);

  const handleLoadFromCollection = useCallback(
    (next: RequestConfig) => {
      loadIntoEditor(next);
      // Track which saved request this is (best effort by config identity).
      for (const collection of collections) {
        for (const request of collection.requests) {
          if (JSON.stringify(request.config) === JSON.stringify(next)) {
            setUpdateTarget({ collectionId: collection.id, requestId: request.id });
            return;
          }
        }
      }
      setUpdateTarget(null);
    },
    [loadIntoEditor, collections],
  );

  const hasSecrets = configHasSensitiveData(config);

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight">API Playground</h1>
            <p className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:block">
              Lightweight REST client - runs 100% in your browser
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasSecrets && (
            <span
              title="This request contains secrets. They stay in your browser."
              className="hidden items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300 md:inline-flex"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Secrets kept locally
            </span>
          )}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the GitHub repository"
            title="GitHub repository"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Code2 className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={() => updateSettings({ theme: dark ? 'light' : 'dark' })}
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={dark ? 'Light theme' : 'Dark theme'}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <div className="hidden w-80 shrink-0 lg:block">
          <Sidebar
            history={history}
            collections={collections}
            onLoadRequest={handleLoadFromCollection}
            onDeleteHistoryEntry={handleDeleteHistoryEntry}
            onClearHistory={handleClearHistory}
            onCreateCollection={handleCreateCollection}
            onRenameCollection={handleRenameCollection}
            onDeleteCollection={handleDeleteCollection}
            onExportCollection={handleExportCollection}
            onExportAll={handleExportAll}
            onImport={handleImport}
            onRenameRequest={handleRenameRequest}
            onDuplicateRequest={handleDuplicateRequest}
            onDeleteRequest={handleDeleteRequest}
          />
        </div>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/50"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl">
              <Sidebar
                history={history}
                collections={collections}
                onLoadRequest={handleLoadFromCollection}
                onDeleteHistoryEntry={handleDeleteHistoryEntry}
                onClearHistory={handleClearHistory}
                onCreateCollection={handleCreateCollection}
                onRenameCollection={handleRenameCollection}
                onDeleteCollection={handleDeleteCollection}
                onExportCollection={handleExportCollection}
                onExportAll={handleExportAll}
                onImport={handleImport}
                onRenameRequest={handleRenameRequest}
                onDuplicateRequest={handleDuplicateRequest}
                onDeleteRequest={handleDeleteRequest}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main workspace */}
        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <RequestBuilder
            config={config}
            sending={sending}
            dark={dark}
            timeoutMs={settings.timeoutMs}
            activeTab={requestTab}
            onTabChange={setRequestTab}
            onConfigChange={updateConfig}
            onSend={() => void handleSend()}
            onCancel={handleCancel}
            onSave={openSaveModal}
            onTimeoutChange={(timeoutMs) => updateSettings({ timeoutMs })}
          />
          <ResponseViewer
            response={response}
            error={error}
            sending={sending}
            requestUrl={config.url}
            onNotify={notify}
          />
          <footer className="pb-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            API Playground - open source, client-side only. Requests are sent directly from your
            browser; saved data never leaves your machine.
          </footer>
        </main>
      </div>

      {saveModalOpen && (
        <SaveRequestModal
          config={config}
          collections={collections}
          updateTarget={updateTarget}
          onSave={handleSaveRequest}
          onUpdate={handleUpdateSavedRequest}
          onClose={closeSaveModal}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
