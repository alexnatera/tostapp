import { useConfirmStore, resolveConfirm } from "../../lib/confirm";

/** Mounted once at the app root (main.tsx). Renders when lib/confirm's confirmDestructive() is called. */
export default function ConfirmDialog() {
  const { open, title, message } = useConfirmStore();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 w-full max-w-sm shadow-xl p-5">
        <h3 id="confirm-dialog-title" className="font-semibold text-stone-900 dark:text-stone-100 text-sm mb-2">
          {title}
        </h3>
        <p id="confirm-dialog-message" className="text-sm text-stone-600 dark:text-stone-400 mb-5">
          {message}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => resolveConfirm(false)}
            className="flex-1 min-h-11 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => resolveConfirm(true)}
            className="flex-1 min-h-11 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
