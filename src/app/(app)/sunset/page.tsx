"use client";

import { useSyncExternalStore } from "react";
import { getTimes } from "suncalc";
import { LiveSky } from "@/components/live-sky";
import { ActionButton } from "@/components/onboarding/action-button";
import { PageTransition } from "@/components/page-transition";
import { SunsetForecast } from "@/components/sunset-forecast";
import { WorldSunsets } from "@/components/world-sunsets";
import { Carousel_002 } from "@/components/ui/skiper-ui/skiper48";
import { SOCIAL_ENABLED } from "@/lib/features";
import { SAMPLE_SUNSETS } from "@/lib/sample-sunsets";
import { describeSunset, formatClock } from "@/lib/sun";
import { useHere, useNow } from "@/lib/use-here";

// Until we know where you are, the sky shows Budapest.
const FALLBACK = { latitude: 47.4979, longitude: 19.0402 };

/** Golden hour → sunset → end of blue hour, with "now" on it when it's close. */
function LightTonight({ golden, sunset, dusk, now }: { golden: Date; sunset: Date; dusk: Date; now: Date }) {
  const span = dusk.getTime() - golden.getTime();
  const at = (d: Date) => ((d.getTime() - golden.getTime()) / span) * 100;
  const nowAt = at(now);
  const marks = [
    { label: "Golden hour", time: golden, x: 0, align: "left" as const },
    { label: "Sunset", time: sunset, x: at(sunset), align: "center" as const },
    { label: "Dark", time: dusk, x: 100, align: "right" as const },
  ];

  return (
    <section aria-labelledby="light-heading" className="mt-6">
      <h2 id="light-heading" className="t-section">
        The light tonight
      </h2>
      <div className="relative mt-5 h-1.5 rounded-full bg-[linear-gradient(to_right,#ffc179,#ff7a3d_55%,#f0648c_75%,#272150)]">
        {nowAt > 0 && nowAt < 100 && (
          <span
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-4 ring-night"
            style={{ left: `${nowAt}%` }}
            aria-label="Now"
          />
        )}
      </div>
      <dl className="relative mt-3 h-11">
        {marks.map((m) => (
          <div
            key={m.label}
            className="absolute"
            style={{
              left: m.align === "right" ? undefined : `${m.x}%`,
              right: m.align === "right" ? 0 : undefined,
              transform: m.align === "center" ? "translateX(-50%)" : undefined,
              textAlign: m.align,
            }}
          >
            <dd className="text-[1.0625rem] font-semibold tabular-nums">{formatClock(m.time)}</dd>
            <dt className="text-[0.8125rem] text-haze">{m.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function SunsetPage() {
  const here = useHere();
  const now = useNow(60000);
  // The sky depends on your clock, so it's drawn on the device only.
  const onDevice = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const place = here.coords ?? FALLBACK;

  const sunset = here.coords ? describeSunset(here.coords, now) : null;
  const times = here.coords ? getTimes(now, here.coords.latitude, here.coords.longitude) : null;

  const slides = SAMPLE_SUNSETS.map((s) => ({
    src: s.photo,
    alt: s.alt,
    caption: (
      <>
        <p className="t-section text-white">{s.title}</p>
        <p className="mt-0.5 text-sm text-white/75">{s.note}</p>
        <p className="mt-3 text-[0.6875rem] text-white/55">Photo: Unsplash</p>
      </>
    ),
  }));

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-md overflow-x-hidden">
        {/* The sky right now, with the countdown written on it */}
        {!onDevice ? (
          <div className="h-[max(56dvh,22rem)] bg-night" />
        ) : (
        <LiveSky latitude={place.latitude} longitude={place.longitude} now={now}>
          <div className="px-6 pt-[max(env(safe-area-inset-top),1rem)]">
            <div className="pt-6 [text-shadow:0_1px_16px_rgb(0_0_0/0.35)]">
              {sunset ? (
                <>
                  <h1 className="t-display">{sunset.headline}</h1>
                  <p className="mt-2 text-[1.0625rem] text-ink/80">{sunset.detail}</p>
                </>
              ) : (
                <h1 className="t-title max-w-[14ch]">When does the sun set where you are?</h1>
              )}
            </div>
          </div>
        </LiveSky>
        )}

        <div className="px-6">
          {!here.coords && (
            <div className="-mt-2">
              <p className="text-[1.0625rem] text-haze">
                {here.status === "denied"
                  ? "Location is off. Turn it on in your settings to see your sky, the countdown and the forecast."
                  : "Share your location to see your own sky, the countdown and tonight's forecast."}
              </p>
              {here.status !== "denied" && (
                <ActionButton
                  className="mt-6"
                  onClick={here.request}
                  disabled={here.status === "locating" || here.status === "checking"}
                >
                  {here.status === "locating" ? "Finding you…" : "Allow location"}
                </ActionButton>
              )}
            </div>
          )}

          {onDevice && times?.goldenHour && times.sunset && times.dusk && (
            <LightTonight golden={times.goldenHour} sunset={times.sunset} dusk={times.dusk} now={now} />
          )}

          {here.coords && (
            <section className="mt-10" aria-labelledby="forecast-heading">
              <h2 id="forecast-heading" className="t-section">
                Will it be a good one?
              </h2>
              <SunsetForecast {...here.coords} />
            </section>
          )}

          <section className="mt-12" aria-labelledby="world-heading">
            <h2 id="world-heading" className="t-section">
              Sunset around the world
            </h2>
            <p className="mt-1 text-[1.0625rem] text-haze">
              The glowing line is where the sun is setting right now. Drag to turn the Earth, tap a city.
            </p>
            {onDevice ? (
              <WorldSunsets now={now} you={here.coords} />
            ) : (
              <div className="-mx-6 mt-2 aspect-square" />
            )}
          </section>

          {SOCIAL_ENABLED && (
            <section className="mt-12" aria-labelledby="saved-heading">
              <h2 id="saved-heading" className="t-section">
                Sunsets your friends saved
              </h2>
              <div className="-mx-6 mt-6 flex justify-center">
                <Carousel_002
                  images={slides}
                  loop
                  spaceBetween={24}
                  cardClassName="h-[min(62dvh,460px)] w-[min(74vw,320px)]"
                />
              </div>
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
