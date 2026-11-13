import { useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { Collection, RequestConfig } from '../types';
import { configHasSensitiveData } from '../lib/security';
import { Modal } from './Modal';

interface SaveRequestModalProps {
  config: RequestConfig;
  collections: Collection[];
  /** Set when the request was loaded from an existing saved request. */
  updateTarget: { collectionId: string; requestId: string } | null;
  onSave: (name: string, collectionId: string | 'new', newCollectionName: string) => void;
  onUpdate: () => void;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

/** Dialog for saving the current request into a collection, with a sensitive-data warning. */
export function SaveRequestModal({
  config,
  collections,
  updateTarget,
  onSave,
  onUpdate,
  onClose,
}: SaveRequestModalProps) {
  const suggestedName = useMemo(() => {
    try {
      const url = new URL(config.url);
      const segment = url.pathname.split('/').filter(Boolean).pop();
      return segment ?? `${config.method} request`;
    } catch {
      return `${config.method} request`;
    }
  }, [config.url, config.method]);

  const [name, setName] = useState(suggestedName);
  const [collectionChoice, setCollectionChoice] = useState<string>(
    collections.length > 0 ? collections[0].id : 'new',
  );
  const [newCollectionName, setNewCollectionName] = useState('My collection');
  const [acknowledged, setAcknowledged] = useState(false);

  const sensitive = configHasSensitiveData(config);
  const canSave = name.trim() !== '' && (!sensitive || acknowledged);

  const submitSave = () => {
    if (!canSave) return;
    onSave(
      name.trim(),
      collectionChoice === 'new' ? 'new' : collectionChoice,
      newCollectionName.trim() || 'My collection',
    );
    onClose();
  };

  return (
    <Modal
      title="Save request"
      onClose={onClose}
      footer={
        <>
          {updateTarget && (
            <button
              type="button"
              onClick={() => {
                onUpdate();
                onClose();
              }}
              className="mr-auto rounded-lg border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
            >
              Update original
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitSave}
            disabled={!canSave}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="save-request-name"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Request name
          </label>
          <input
            id="save-request-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="save-request-collection"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Collection
          </label>
          <select
            id="save-request-collection"
            value={collectionChoice}
            onChange={(e) => setCollectionChoice(e.target.value)}
            className={inputClass}
          >
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
            <option value="new">+ New collection…</option>
          </select>
        </div>

        {collectionChoice === 'new' && (
          <div>
            <label
              htmlFor="save-request-new-collection"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              New collection name
            </label>
            <input
              id="save-request-new-collection"
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {sensitive && (
          <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="flex items-start gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              This request contains authentication data (token, password or sensitive header).
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Saving will store those secrets in this browser's local storage. They are never sent
              to any cloud service, but anyone with access to this browser profile can read them.
              Do not save secrets on a shared computer.
            </p>
            <label className="flex items-start gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-amber-600"
              />
              I understand that this authentication data will be stored locally in my browser.
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}
