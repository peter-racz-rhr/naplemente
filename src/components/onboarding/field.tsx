import { Check } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hideLabel,
  icon,
  hint,
  error,
  valid,
  className,
  ...props
}: ComponentProps<"input"> & {
  label: string;
  /** Keep the label for screen readers only; the placeholder shows instead. */
  hideLabel?: boolean;
  /** Icon shown inside the field, on the left. */
  icon?: ReactNode;
  hint?: string;
  error?: string | null;
  valid?: boolean;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "mb-2 block text-[0.9375rem] text-haze"}
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-haze [&_svg]:size-[1.125rem]"
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-14 w-full rounded-2xl border bg-dusk pr-12 text-[1.0625rem] text-ink caret-gold outline-none placeholder:text-haze/70 focus:border-gold",
            icon ? "pl-11" : "pl-4",
            error ? "border-error" : "border-dusk-edge",
          )}
          {...props}
        />
        {valid && !error && (
          <Check
            aria-hidden
            className="absolute top-1/2 right-4 size-5 -translate-y-1/2 text-ok"
          />
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-haze">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
