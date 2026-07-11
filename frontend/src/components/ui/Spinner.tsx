/** Accessible loading spinner: announces to screen readers and respects prefers-reduced-motion. */
export default function Spinner({ label = "Cargando", className = "" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-label={label} className={`inline-flex items-center ${className}`}>
      <div className="animate-spin motion-reduce:animate-none rounded-full border-2 border-stone-300 dark:border-stone-700 border-t-amber-600 dark:border-t-amber-400 h-6 w-6" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
