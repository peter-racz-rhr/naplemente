"use client";

import { getTimes } from "suncalc";
import { ActionButton } from "@/components/onboarding/action-button";
import { PageTransition } from "@/components/page-transition";
import { SunsetForecast } from "@/components/sunset-forecast";
import { Carousel_002 } from "@/components/ui/skiper-ui/skiper48";
import { SOCIAL_ENABLED } from "@/lib/features";
import { SAMPLE_SUNSETS } from "@/lib/sample-sunsets";
import { describeSunset, formatClock } from "@/lib/sun";
import { useHere, useNow } from "@/lib/use-here";

export default function SunsetPage() {
  const here = useHere();
  const now = useNow();

  const sunset = here.coords ? describeSunset(here.coords, now) : null;
  const times = here.coords ? getTimes(now, here.coords.latitude, here.coords.longitude) : null;

  const slides = SAMPLE_SUNSETS.map((s) => ({
    src: s.photo,
    alt: s.alt,
    caption: (
      <>
        <p className="t-section text-white">
          {s.title}
        </p>
        <p className="mt-0.5 text-sm text-white/75">{s.note}</p>
        <p className="mt-3 text-[0.6875rem] text-white/55">Photo: Unsplash</p>
      </>
    ),
  }));

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-md overflow-x-hidden px-6 pt-[max(env(safe-area-inset-top),1rem)]">
        {/* Countdown */}
        <section className="pt-6">
          {sunset ? (
            <>
              <h1 className="t-display">
                {sunset.headline}
              </h1>
              <p className="mt-2 text-[1.0625rem] text-haze">{sunset.detail}</p>
            </>
          ) : (
            <>
              <h1 className="t-title">
                When does the sun set where you are?
              </h1>
              <p className="mt-2 text-[1.0625rem] text-haze">
                {here.status === "denied"
                  ? "Location is off. Turn it on in your settings to see the countdown and forecast."
                  : "Share your location to see the countdown and tonight's forecast."}
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
            </>
          )}
        </section>

        {/* Light timeline */}
        {times?.sunset && !Number.isNaN(times.sunset.getTime()) && (
          <dl className="mt-8 grid grid-cols-3 gap-2 rounded-[1.5rem] bg-dusk p-4">
            {[
              ["Golden hour", times.goldenHour],
              ["Sunset", times.sunset],
              ["Blue hour ends", times.dusk],
            ].map(([label, time]) => (
              <div key={label as string}>
                <dt className="text-[0.8125rem] text-haze">{label as string}</dt>
                <dd className="mt-1 t-section">
                  {formatClock(time as Date)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* Tonight's forecast */}
        {here.coords && (
          <section className="mt-8" aria-labelledby="forecast-heading">
            <h2 id="forecast-heading" className="t-section">
              Sunset forecast
            </h2>
            <SunsetForecast {...here.coords} />
          </section>
        )}

        {/* Photo carousel */}
        <section className="mt-10" aria-labelledby="saved-heading">
          <h2 id="saved-heading" className="t-section">
            {SOCIAL_ENABLED ? "Sunsets your friends saved" : "Sunset inspiration"}
          </h2>
          <p className="mt-1 text-[0.9375rem] text-haze">Swipe through the cards.</p>
          <div className="-mx-6 mt-6 flex justify-center">
            <Carousel_002
              images={slides}
              loop
              spaceBetween={24}
              cardClassName="h-[min(62dvh,460px)] w-[min(74vw,320px)]"
            />
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
