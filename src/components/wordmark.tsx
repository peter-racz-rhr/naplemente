import { cn } from "@/lib/utils";

/** "naplemente" with its sun half sunk below the baseline. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-end gap-[0.28em] text-[2.25rem] leading-none font-semibold tracking-[-0.03em] text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className="relative mb-[0.02em] inline-block h-[0.5em] w-[1em] overflow-hidden"
      >
        <span className="sun-mark absolute inset-x-0 top-0 h-[1em] rounded-full" />
      </span>
      naplemente
    </span>
  );
}
