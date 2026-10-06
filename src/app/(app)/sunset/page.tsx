"use client";

import { CloudRain, Thermometer } from "lucide-react";
import { useEffect, useState } from "react";
import { getTimes } from "suncalc";
import { ActionButton } from "@/components/onboarding/action-button";
import { PageTransition } from "@/components/page-transition";
import { Carousel_002 } from "@/components/ui/skiper-ui/skiper48";
import { fetchSunsetForecast, type SunsetDay, type SunsetQuality } from "@/lib/forecast";
import { SAMPLE_SUNSETS } from "@/lib/sample-sunsets";
import { describeSunset, formatClock } from "@/lib/sun";
import { useHere, useNow } from "@/lib/use-here";
import { cn } from "@/lib/utils";

const QUALITY: Record<SunsetQuality, { label: string; dot: string }> = {
  great: { label: "Great", dot: "bg-gold" },
  good: { label: "Good", dot: "bg-ember" },
  okay: { label: "Okay", dot: "bg-haze" },
  poor: { label: "Poor", dot: "bg-dusk-edge" },
};

const weekday = (date: string, index: number) =>
  index === 0
    ? "Tonight"
    : index === 1
      ? "Tomorrow"
      : new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
          new Date(`${date}T12:00:00`),
        );

type Forecast =
  | { state: "idle" | "loading" }
  | { state: "ready"; days: SunsetDay[] }
  | { state: "error" };

export default function SunsetPage() {
  const here = useHere();
  const now = useNow();
  const [forecast, setForecast] = useState<Forecast>({ state: "idle" });

  useEffect(() => {
    if (!here.coords) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForecast({ state: "loading" });
    fetchSunsetForecast(here.coords.latitude, here.coords.longitude, controller.signal)
      .then((days) => setForecast({ state: "ready", days }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setForecast({ state: "error" });
        }
      });
    return () => controller.abort();
  }, [here.coords]);

  const sunset = here.coords ? describeSunset(here.coords, now) : null;
  const times = here.coords ? getTimes(now, here.coords.latitude, here.coords.longitude) : null;
  const tonight = forecast.state === "ready" ? forecast.days[0] : null;

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

            {forecast.state === "loading" && (
              <p className="mt-3 text-haze">Checking the clouds…</p>
            )}
            {forecast.state === "error" && (
              <p className="mt-3 text-haze">
                The forecast didn&apos;t load. Check your connection and open this tab again.
              </p>
            )}

            {tonight && (
              <div className="mt-4 rounded-[1.5rem] border border-dusk-edge p-5">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", QUALITY[tonight.quality].dot)} />
                  <p className="text-[1.0625rem] font-semibold">
                    {QUALITY[tonight.quality].label} sunset likely tonight
                  </p>
                </div>
                <p className="mt-1 text-haze">{tonight.reason}.</p>
                <div className="mt-4 flex gap-5 text-sm text-haze">
                  <span className="inline-flex items-center gap-1.5">
                    <Thermometer className="size-4" aria-hidden /> {tonight.temperature}°
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CloudRain className="size-4" aria-hidden /> {tonight.rainChance}% rain
                  </span>
                  <span>
                    Clouds {tonight.clouds.low}/{tonight.clouds.mid}/{tonight.clouds.high}%
                    <span className="sr-only"> low, mid and high</span>
                  </span>
                </div>
              </div>
            )}

            {forecast.state === "ready" && (
              <ul className="mt-3 divide-y divide-dusk-edge">
                {forecast.days.slice(1).map((day, i) => (
                  <li key={day.date} className="flex items-center justify-between py-3.5">
                    <span>{weekday(day.date, i + 1)}</span>
                    <span className="flex items-center gap-4">
                      <span className="text-haze tabular-nums">{day.sunset}</span>
                      <span className="flex w-16 items-center gap-2">
                        <span className={cn("size-2 rounded-full", QUALITY[day.quality].dot)} />
                        {QUALITY[day.quality].label}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {forecast.state === "ready" && (
              <p className="mt-2 text-[0.75rem] text-haze">Weather: Open-Meteo.com</p>
            )}
          </section>
        )}

        {/* Friends' sunsets */}
        <section className="mt-10" aria-labelledby="saved-heading">
          <h2 id="saved-heading" className="t-section">
            Sunsets your friends saved
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
