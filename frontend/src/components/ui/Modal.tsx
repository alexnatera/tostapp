import type { ReactNode } from "react";
import { X } from "lucide-react";
import IconButton from "./IconButton";

/** Hoisted from DocumentFormPage.tsx (was a locally-defined component). Same behavior, now shared. */
export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between pl-5 pr-2 py-2 border-b border-stone-100 dark:border-stone-800">
          <h3 id="modal-title" className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
            {title}
          </h3>
          <IconButton aria-label="Cerrar" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
