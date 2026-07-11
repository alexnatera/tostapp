import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

interface ComboboxProps<T> {
  items: T[];
  value: T | null;
  onSelect: (item: T | null) => void;
  onCreateNew?: () => void;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string;
  placeholder: string;
  createLabel?: string;
  label?: string;
}

/**
 * Accessible replacement for the mouse-only "type a name, click a suggestion" pattern
 * that was copy-pasted (with drift) across DocumentFormPage, PurchasesPage and SalesPage.
 * Real combobox/listbox ARIA roles + full keyboard support (Arrow keys, Enter, Escape).
 */
export default function Combobox<T>({
  items,
  value,
  onSelect,
  onCreateNew,
  getLabel,
  getSubLabel,
  placeholder,
  createLabel,
  label,
}: ComboboxProps<T>) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const inputId = useId();

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = items.filter((i) => getLabel(i).toLowerCase().includes(query.toLowerCase()));
  const optionCount = filtered.length + (onCreateNew ? 1 : 0);

  function selectAt(index: number) {
    if (index >= 0 && index < filtered.length) {
      onSelect(filtered[index]);
      setQuery("");
    } else if (onCreateNew) {
      onCreateNew();
    }
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      setActiveIndex(0);
      e.preventDefault();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, optionCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) selectAt(activeIndex);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={ref} className="relative">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
          {label}
        </label>
      )}
      <div
        className="flex items-center gap-2 w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 min-h-11 cursor-text focus-within:ring-2 focus-within:ring-amber-400 dark:focus-within:ring-amber-500"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {value && !open ? (
          <>
            <span className="text-base text-stone-900 dark:text-stone-100 flex-1 truncate">{getLabel(value)}</span>
            <button
              type="button"
              aria-label="Quitar selección"
              onClick={(e) => { e.stopPropagation(); onSelect(null); setQuery(""); }}
              className="min-w-6 min-h-6 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <input
            id={inputId}
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
            aria-autocomplete="list"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
          />
        )}
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto"
        >
          {filtered.length === 0 && !onCreateNew && (
            <li className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400">Sin resultados</li>
          )}
          {filtered.map((item, i) => (
            <li
              key={i}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={activeIndex === i}
              onMouseDown={() => selectAt(i)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-4 py-2.5 min-h-11 flex flex-col justify-center cursor-pointer transition-colors ${
                activeIndex === i ? "bg-stone-50 dark:bg-stone-800" : ""
              }`}
            >
              <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{getLabel(item)}</p>
              {getSubLabel && <p className="text-xs text-stone-500 dark:text-stone-400">{getSubLabel(item)}</p>}
            </li>
          ))}
          {onCreateNew && (
            <li
              id={`${listId}-opt-${filtered.length}`}
              role="option"
              aria-selected={activeIndex === filtered.length}
              onMouseDown={() => selectAt(filtered.length)}
              onMouseEnter={() => setActiveIndex(filtered.length)}
              className={`px-4 py-2.5 min-h-11 flex items-center border-t border-stone-100 dark:border-stone-800 text-xs font-semibold text-amber-700 dark:text-amber-400 cursor-pointer transition-colors ${
                activeIndex === filtered.length ? "bg-amber-50 dark:bg-amber-900/20" : ""
              }`}
            >
              + {createLabel}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
