import { forwardRef, type ButtonHTMLAttributes } from "react";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  "aria-label": string;
  variant?: "default" | "danger";
}

/**
 * Icon-only button that always enforces a 44x44px minimum tap target,
 * a visible focus-visible ring, and (via the required aria-label prop)
 * an accessible name. Use this instead of ad-hoc "×"/emoji <button>s.
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className = "", variant = "default", type = "button", children, ...props },
  ref
) {
  const base =
    "inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantCls =
    variant === "danger"
      ? "text-stone-500 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
      : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800";

  return (
    <button ref={ref} type={type} className={`${base} ${variantCls} ${className}`} {...props}>
      {children}
    </button>
  );
});

export default IconButton;
