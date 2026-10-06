"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";
import { cn } from "@/lib/utils";

/** Full-height mobile screen that respects the notch and home indicator. */
export function Screen({
  children,
  back,
  aside,
  className,
}: {
  children: ReactNode;
  back?: boolean;
  aside?: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <PageTransition>
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]",
        className,
      )}
    >
      {(back || aside) && (
        <div className="flex h-12 items-center justify-between">
          {back ? (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="-ml-2 grid size-11 place-items-center rounded-full text-ink hover:bg-dusk"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : (
            <span />
          )}
          {aside}
        </div>
      )}
      {children}
    </main>
    </PageTransition>
  );
}
