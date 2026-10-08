"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ActionButton } from "@/components/onboarding/action-button";
import { Screen } from "@/components/onboarding/screen";
import { FORWARD } from "@/components/page-transition";
import { markOnboarded } from "@/lib/onboarding";
import { useSpots } from "@/lib/spots";
import { formatClock, nextSunset } from "@/lib/sun";
import { useHere } from "@/lib/use-here";
import { cn } from "@/lib/utils";
import { LOCALE } from "@/lib/locale";

type State = "idle" | "asking" | "granted" | "denied" | "unsupported";

/** How long before sunset the reminder goes out in the preview. */
const LEAD_MINUTES = 35;

const dateLine = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/*
  Instead of describing reminders, show one: the lock screen at the moment
  it arrives, with the real sunset time and one of your real spots.
*/
export default function NotificationsPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const here = useHere();
  const spots = useSpots();
  // Times depend on your clock and timezone, so draw them on the device only.
  const onDevice = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    // iPhone only offers notifications once the app is on the Home Screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!("Notification" in window)) setState("unsupported");
    else if (Notification.permission === "granted") setState("granted");
    else if (Notification.permission === "denied") setState("denied");
  }, []);

  const finish = () => {
    markOnboarded();
    router.replace("/map", { transitionTypes: FORWARD });
  };

  const ask = async () => {
    setState("asking");
    const result = await Notification.requestPermission();
    setState(result === "granted" ? "granted" : "denied");
  };

  // The preview: today's (or tomorrow's) sunset where you are, or a
  // believable evening if we don't know where you are.
  const next = here.coords ? nextSunset(here.coords.latitude, here.coords.longitude) : null;
  const sunset =
    next?.kind === "sunset"
      ? next.at
      : (() => {
          const d = new Date();
          d.setHours(18, 40, 0, 0);
          return d;
        })();
  const reminderAt = new Date(sunset.getTime() - LEAD_MINUTES * 60000);
  const spotName = spots[0]?.name ?? "your spot";

  const copy: Record<State, { title: string; body: string }> = {
    idle: {
      title: "Know when to leave",
      body: "One reminder before sunset, early enough to reach your spot. Nothing else.",
    },
    asking: {
      title: "Know when to leave",
      body: "One reminder before sunset, early enough to reach your spot. Nothing else.",
    },
    granted: {
      title: "Reminders are on",
      body: "You'll hear from us before sunset, and only then.",
    },
    denied: {
      title: "Reminders are off",
      body: "You can turn them on any time in your phone's settings.",
    },
    unsupported: {
      title: "Add Naplemente to your Home Screen",
      body: "On iPhone, reminders work once the app is on your Home Screen: tap Share, then Add to Home Screen.",
    },
  };

  return (
    <Screen className="relative overflow-hidden">
      {/* A low horizon glow, the only colour on the screen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55dvh] bg-[radial-gradient(120%_70%_at_50%_100%,rgba(255,122,61,0.28),rgba(240,100,140,0.12)_45%,transparent_75%)]"
      />

      {/* The lock screen moment */}
      <div aria-hidden className="relative flex flex-1 flex-col items-center pt-[8dvh]">
        {onDevice && (
        <>
        <p className="text-[0.9375rem] text-haze animate-in fade-in duration-700">
          {dateLine.format(reminderAt)}
        </p>
        <p className="mt-1 text-[5.5rem] leading-none font-[450] tracking-[-0.04em] tabular-nums [font-stretch:88%] animate-in fade-in duration-700">
          {formatClock(reminderAt).replace(/\s?[AP]M$/i, "")}
        </p>

        <div className="glass mt-10 w-full rounded-[1.5rem] px-4 py-3.5 animate-in fade-in slide-in-from-top-6 fill-mode-both delay-500 duration-700 ease-out">
          <div className="flex items-center gap-2 text-[0.8125rem] text-haze">
            <span className="relative block size-5 overflow-hidden rounded-[0.4rem] bg-night">
              <span className="sun-mark absolute inset-x-[3px] top-[7px] h-[14px] rounded-full" />
            </span>
            <span className="flex-1">Naplemente</span>
            <span>now</span>
          </div>
          <p className="mt-2 font-semibold">Leave now for {spotName}</p>
          <p className="mt-0.5 text-[0.9375rem] text-ink/80">
            Sunset at {formatClock(sunset)}. You&apos;ll be there for the last light.
          </p>
        </div>

        {state === "granted" && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-ok animate-in fade-in">
            <Check className="size-4" /> This is what you&apos;ll get
          </p>
        )}
        </>
        )}
      </div>

      {/* What it is, and the choice */}
      <div className="relative">
        <h1 className="t-title">{copy[state].title}</h1>
        <p className="mt-3 text-[1.0625rem] leading-snug text-haze">{copy[state].body}</p>
        <div className={cn("mt-8 flex flex-col gap-2")}>
          {state === "idle" || state === "asking" ? (
            <>
              <ActionButton onClick={ask} disabled={state === "asking"}>
                {state === "asking" ? "Waiting for your answer…" : "Turn on reminders"}
              </ActionButton>
              <ActionButton variant="quiet" className="h-12" onClick={finish}>
                Not now
              </ActionButton>
            </>
          ) : (
            <ActionButton onClick={finish}>
              {state === "unsupported" ? "Continue" : "Start exploring"}
            </ActionButton>
          )}
        </div>
      </div>
    </Screen>
  );
}
