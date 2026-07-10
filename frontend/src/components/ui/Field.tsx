import { useId, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

interface FieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  hint?: string;
}

/**
 * Form field wrapper that generates one id via useId() and wires it to
 * both the <label htmlFor> and the child input/select/textarea, so the
 * label is always programmatically associated — including when the
 * child comes from react-hook-form's register() spread.
 */
export default function Field({ label, children, error, required, hint }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1.5">
        {label}
        {required && <span className="text-red-500 dark:text-red-400 ml-0.5">*</span>}
      </label>
      {child}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
