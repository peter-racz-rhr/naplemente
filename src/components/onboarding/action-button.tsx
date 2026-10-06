import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "quiet";

const styles: Record<Variant, string> = {
  primary:
    "bg-ink text-night hover:bg-white disabled:bg-ink/35 disabled:text-night/70",
  secondary:
    "bg-dusk text-ink border border-dusk-edge hover:border-haze/60 disabled:text-haze",
  quiet: "text-haze hover:text-ink",
};

const base =
  "inline-flex h-14 w-full items-center justify-center gap-3 rounded-full px-6 text-[1.0625rem] font-semibold tracking-[-0.01em] transition-colors outline-offset-4 focus-visible:outline-2 disabled:cursor-not-allowed";

export function ActionButton({
  variant = "primary",
  className,
  icon,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; icon?: ReactNode }) {
  return (
    <button className={cn(base, styles[variant], className)} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function ActionLink({
  variant = "primary",
  className,
  icon,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; icon?: ReactNode }) {
  return (
    <Link className={cn(base, styles[variant], className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
