import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

/** Transient notification shown in the bottom-right corner. */
export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[60] flex max-w-sm items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
