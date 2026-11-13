import { useState } from 'react';
import { Modal } from './Modal';

interface PromptModalProps {
  title: string;
  label: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

/** Small dialog with a single text input, used for renames. */
export function PromptModal({
  title,
  label,
  initialValue = '',
  submitLabel = 'Save',
  onSubmit,
  onClose,
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      widthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-1.5"
      >
        <label htmlFor="prompt-modal-input" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <input
          id="prompt-modal-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </form>
    </Modal>
  );
}
