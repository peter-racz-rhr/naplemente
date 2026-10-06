import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

/** Initials on a two-color gradient; stands in for profile photos. */
export function Avatar({
  name,
  colors,
  className,
}: {
  name: string;
  colors: [string, string];
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full text-[0.9375rem] font-semibold text-night",
        className,
      )}
      style={{ background: `linear-gradient(140deg, ${colors[0]}, ${colors[1]})` }}
    >
      {initials(name) || "?"}
    </span>
  );
}
