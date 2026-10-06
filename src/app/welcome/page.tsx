"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionButton, ActionLink } from "@/components/onboarding/action-button";
import { SunsetGlobe } from "@/components/sunset-globe";
import { hasAcceptedTerms, markTermsAccepted } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

/*
  One continuous scene: the planet rises from below like a horizon, two short
  lines point at the glowing sunset line on it, then the planet lifts up and
  the welcome panel takes its place underneath.
*/
type Phase = "dark" | "beat-1" | "beat-2" | "welcome";

const BEATS: Record<"beat-1" | "beat-2", string> = {
  "beat-1": "Right now, the sun is setting somewhere.",
  "beat-2": "It happens along that glowing line.",
};

const BEAT_MS = 2800;
const READY_TIMEOUT_MS = 4000;

// Globe canvas size; the sphere fills about 69% of it.
const GLOBE_SIZE = "min(150vw, 780px)";

const globeTransform: Record<Phase, string> = {
  // Out of sight, below the screen.
  dark: "translate(-50%, 100dvh)",
  // Only the top of the planet shows, like a horizon.
  "beat-1": `translate(-50%, calc(48dvh - ${GLOBE_SIZE} * 0.155))`,
  "beat-2": `translate(-50%, calc(40dvh - ${GLOBE_SIZE} * 0.155))`,
  // Lifted into the top half, smaller, the panel below it.
  welcome: `translate(-50%, calc(30dvh - ${GLOBE_SIZE} * 0.5)) scale(0.8)`,
};

export default function WelcomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("dark");
  const [ready, setReady] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Storage and the URL are only readable after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasAcceptedTerms()) setAgreed(true);
    // Coming back from "Log in" shouldn't replay the intro.
    if (new URLSearchParams(window.location.search).get("intro") === "skip") {
      setPhase("welcome");
    }
  }, []);

  // Start rising once the textures are in, or after a timeout on slow networks.
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const next: Partial<Record<Phase, Phase>> = {
      dark: "beat-1",
      "beat-1": "beat-2",
      "beat-2": "welcome",
    };
    const following = next[phase];
    if (!following) return;
    const timer = window.setTimeout(
      () => setPhase(following),
      phase === "dark" ? 150 : BEAT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase, ready]);

  const onReady = useCallback(() => setReady(true), []);
  const skipIntro = () => setPhase("welcome");
  const inIntro = phase !== "welcome";

  const createAccount = () => {
    markTermsAccepted();
    router.push("/signup");
  };

  return (
    <main
      className="relative mx-auto min-h-dvh w-full max-w-md overflow-hidden bg-night"
      onClick={inIntro && phase !== "dark" ? skipIntro : undefined}
    >
      <div
        className="pointer-events-auto absolute top-0 left-1/2 transition-transform duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: GLOBE_SIZE,
          height: GLOBE_SIZE,
          transform: globeTransform[phase],
        }}
      >
        <SunsetGlobe className="h-full w-full" onReady={onReady} />
      </div>

      {inIntro && (
        <button
          type="button"
          onClick={skipIntro}
          className="absolute top-[max(env(safe-area-inset-top),1rem)] right-4 z-10 rounded-full px-4 py-2 text-[0.9375rem] text-haze hover:text-ink"
        >
          Skip
        </button>
      )}

      {/* Intro lines */}
      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 top-[16dvh] z-10 px-8 text-center"
      >
        {(["beat-1", "beat-2"] as const).map((beat) => (
          <p
            key={beat}
            className={cn(
              "absolute inset-x-8 text-[1.75rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-ink transition-opacity duration-700",
              phase === beat ? "opacity-100" : "opacity-0",
            )}
          >
            {BEATS[beat]}
          </p>
        ))}
      </div>

      {/* Welcome panel */}
      <section
        aria-hidden={inIntro}
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] transition-[opacity,translate] delay-300 duration-700 ease-out",
          inIntro
            ? "pointer-events-none translate-y-6 opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <h1 className="text-center text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.035em] text-ink">
          Welcome to Naplemente
        </h1>
        <p className="mx-auto mt-3 max-w-[30ch] text-center text-[1.0625rem] leading-snug text-haze">
          Save the places where you watch the sun go down, and find new ones.
        </p>

        <label className="mt-8 flex cursor-pointer items-start gap-3 text-[0.875rem] leading-snug text-haze">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-gold"
            tabIndex={inIntro ? -1 : 0}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-ink underline underline-offset-2">
              Terms
            </Link>{" "}
            and have read the{" "}
            <Link href="/privacy" className="text-ink underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <div className="mt-5 flex flex-col gap-3">
          <ActionButton
            disabled={!agreed}
            onClick={createAccount}
            tabIndex={inIntro ? -1 : 0}
          >
            Create an account
          </ActionButton>
          <ActionLink
            href="/login"
            variant="secondary"
            tabIndex={inIntro ? -1 : 0}
          >
            Log in
          </ActionLink>
        </div>
      </section>
    </main>
  );
}
