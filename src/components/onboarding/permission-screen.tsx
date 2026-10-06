import type { ReactNode } from "react";
import { Screen } from "./screen";

/** Shared layout for the "why we ask" screens before each system prompt. */
export function PermissionScreen({
  icon,
  title,
  body,
  children,
  step,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  children: ReactNode;
  step: { current: number; total: number };
}) {
  return (
    <Screen>
      <div
        className="flex h-12 items-center gap-2"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={1}
        aria-valuemax={step.total}
        aria-valuenow={step.current}
      >
        {Array.from({ length: step.total }, (_, i) => (
          <span
            key={i}
            className={
              i < step.current
                ? "h-1 flex-1 rounded-full bg-ink"
                : "h-1 flex-1 rounded-full bg-dusk-edge"
            }
          />
        ))}
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 grid size-16 place-items-center rounded-[1.25rem] bg-dusk text-gold">
          {icon}
        </div>
        <h1 className="text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
          {title}
        </h1>
        <div className="mt-4 text-[1.0625rem] leading-snug text-haze">
          {body}
        </div>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </Screen>
  );
}
