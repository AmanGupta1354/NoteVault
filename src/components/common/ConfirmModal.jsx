import { AlertTriangle, X } from 'lucide-react'

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  isLoading = false,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                danger
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {message}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${
              danger
                ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
                : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
