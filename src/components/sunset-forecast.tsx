"use client";

import { CloudRain, Thermometer } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchSunsetForecast, type SunsetDay, type SunsetQuality } from "@/lib/forecast";
import { cn } from "@/lib/utils";

export const QUALITY: Record<SunsetQuality, { label: string; dot: string }> = {
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

type State = { state: "loading" } | { state: "ready"; days: SunsetDay[] } | { state: "error" };

/** Tonight's sunset rating and the next few days, for one place. */
export function SunsetForecast({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const [forecast, setForecast] = useState<State>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForecast({ state: "loading" });
    fetchSunsetForecast(latitude, longitude, controller.signal)
      .then((days) => setForecast({ state: "ready", days }))
      .catch(() => {
        if (!controller.signal.aborted) setForecast({ state: "error" });
      });
    return () => controller.abort();
  }, [latitude, longitude]);

  if (forecast.state === "loading") return <p className="mt-3 text-haze">Checking the clouds…</p>;
  if (forecast.state === "error")
    return (
      <p className="mt-3 text-haze">
        The forecast didn&apos;t load. Check your connection and try again.
      </p>
    );

  const [tonight, ...later] = forecast.days;
  return (
    <>
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
      <ul className="mt-3 divide-y divide-dusk-edge">
        {later.map((day, i) => (
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
      <p className="mt-2 text-[0.75rem] text-haze">Weather: Open-Meteo.com</p>
    </>
  );
}
