"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActionButton, ActionLink } from "@/components/onboarding/action-button";
import { FORWARD, PageTransition } from "@/components/page-transition";
import { SunsetGlobe } from "@/components/sunset-globe";
import { Wordmark } from "@/components/wordmark";
import { locationPermission, requestLocation, type Coordinates } from "@/lib/location";
import { hasAcceptedTerms, markTermsAccepted, takeReplayFlag } from "@/lib/onboarding";
import { describeSunset } from "@/lib/sun";
import { cn } from "@/lib/utils";

/*
  The planet spins up from the bottom of the screen. Before anything else we
  ask where you are; if you say yes, the screen answers with how long until
  the sun goes down there. Then the account buttons appear.
*/
type Stage =
  | { kind: "checking" }
  | { kind: "asking" }
  | { kind: "locating" }
  | { kind: "sunset"; coords: Coordinates }
  | { kind: "welcome"; locationOff?: boolean };

const READY_TIMEOUT_MS = 4000;

// Globe canvas size; the sphere fills about 69% of it, starting 15.5% down.
const GLOBE_SIZE = "min(150vw, 780px)";
const sphereTopAt = (y: string) =>
  `translate(-50%, calc(${y} - ${GLOBE_SIZE} * 0.155))`;

export default function WelcomePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [ready, setReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const locate = useCallback(async () => {
    setStage({ kind: "locating" });
    try {
      const coords = await requestLocation();
      setNow(new Date());
      setStage({ kind: "sunset", coords });
    } catch {
      setStage({ kind: "welcome", locationOff: true });
    }
  }, []);

  // Storage, the URL and permissions are only readable after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasAcceptedTerms()) setAgreed(true);
    const skipToAccount =
      new URLSearchParams(window.location.search).get("intro") === "skip";

    // Replaying the intro from Profile shows the location question even if
    // it was already answered.
    const replay = takeReplayFlag();
    void locationPermission().then((state) => {
      if (replay) setStage({ kind: "asking" });
      else if (state === "granted") void locate();
      else if (state === "denied" || skipToAccount) setStage({ kind: "welcome" });
      else setStage({ kind: "asking" });
    });
  }, [locate]);

  // Show the globe once its textures are in, or after a timeout on slow networks.
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Keep the countdown honest while the screen is open.
  useEffect(() => {
    if (stage.kind !== "sunset") return;
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, [stage.kind]);

  const onReady = useCallback(() => setReady(true), []);

  const createAccount = () => {
    markTermsAccepted();
    router.push("/signup", { transitionTypes: FORWARD });
  };

  const showAccount = stage.kind === "sunset" || stage.kind === "welcome";
  const sunset = stage.kind === "sunset" ? describeSunset(stage.coords, now) : null;

  return (
    <PageTransition>
      <main className="relative mx-auto min-h-dvh w-full max-w-md overflow-hidden bg-night">
        {/* The planet, in the bottom half */}
        <div
          className={cn(
            "absolute top-0 left-1/2 transition-[transform,opacity] duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            ready ? "opacity-100" : "opacity-0",
          )}
          style={{
            width: GLOBE_SIZE,
            height: GLOBE_SIZE,
            // Soft top edge: zoomed in, the planet fades out instead of being cut off.
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 13%)",
            transform: !ready
              ? sphereTopAt("85dvh")
              : showAccount
                ? sphereTopAt("max(64dvh, 470px)")
                : sphereTopAt("max(50dvh, 360px)"),
          }}
        >
          <SunsetGlobe
            className="h-full w-full"
            onReady={onReady}
            you={stage.kind === "sunset" ? stage.coords : null}
          />
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col px-6 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="flex h-12 items-center">
            <Wordmark className="text-[1.375rem]" />
          </div>

          <div aria-live="polite" className="mt-[6dvh]">
            {(stage.kind === "checking" ||
              stage.kind === "asking" ||
              stage.kind === "locating") && (
              <Reveal key="ask">
                <h1 className="t-title">
                  When does the sun set where you are?
                </h1>
                <p className="mt-3 max-w-[32ch] text-[1.0625rem] leading-snug text-haze">
                  Share your location and we&apos;ll count down to tonight&apos;s
                  sunset.
                </p>
                <div
                  className={cn(
                    "mt-7 flex flex-col gap-2 transition-opacity duration-500",
                    stage.kind === "checking" && "invisible opacity-0",
                  )}
                >
                  <ActionButton
                    onClick={locate}
                    disabled={stage.kind !== "asking"}
                  >
                    {stage.kind === "locating" ? "Finding you…" : "Allow location"}
                  </ActionButton>
                  <ActionButton
                    variant="quiet"
                    className="h-12"
                    disabled={stage.kind !== "asking"}
                    onClick={() => setStage({ kind: "welcome" })}
                  >
                    Not now
                  </ActionButton>
                </div>
              </Reveal>
            )}

            {sunset && (
              <Reveal key="sunset">
                <h1 className="t-display">
                  {sunset.headline}
                </h1>
                <p className="mt-3 text-[1.0625rem] leading-snug text-haze">
                  {sunset.detail}
                </p>
              </Reveal>
            )}

            {stage.kind === "welcome" && (
              <Reveal key="welcome">
                <h1 className="t-title">
                  Welcome to Naplemente
                </h1>
                <p className="mt-3 max-w-[32ch] text-[1.0625rem] leading-snug text-haze">
                  {stage.locationOff
                    ? "Location is off, so we can't count down to your sunset yet. You can turn it on later in Settings."
                    : "Save the places where you watch the sun go down, and find new ones."}
                </p>
              </Reveal>
            )}
          </div>

          {showAccount && (
            <Reveal key="account" delay={stage.kind === "sunset" ? 900 : 250}>
              <div className="mt-7">
                <label className="flex cursor-pointer items-start gap-3 text-[0.875rem] leading-snug text-haze">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 size-5 shrink-0 cursor-pointer accent-gold"
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      transitionTypes={FORWARD}
                      className="text-ink underline underline-offset-2"
                    >
                      Terms
                    </Link>{" "}
                    and have read the{" "}
                    <Link
                      href="/privacy"
                      transitionTypes={FORWARD}
                      className="text-ink underline underline-offset-2"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                <div className="mt-5 flex flex-col gap-3">
                  <ActionButton disabled={!agreed} onClick={createAccount}>
                    Create an account
                  </ActionButton>
                  <ActionLink href="/login" variant="secondary">
                    Log in
                  </ActionLink>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </main>
    </PageTransition>
  );
}

/** Fades content up into place when it first appears. */
function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 ease-out"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
