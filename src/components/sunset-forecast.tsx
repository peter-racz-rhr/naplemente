"use client";

import { CloudRain, Thermometer } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchSunsetForecast, type SunsetDay, type SunsetQuality } from "@/lib/forecast";
import { cn } from "@/lib/utils";

export const QUALITY: Record<SunsetQuality, { label: string; text: string }> = {
  great: { label: "Great", text: "text-gold" },
  good: { label: "Good", text: "text-ember" },
  okay: { label: "Okay", text: "text-ink" },
  poor: { label: "Poor", text: "text-haze" },
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
        <div className="mt-4">
          <p className="text-[0.875rem] text-haze">Tonight</p>
          <p className={cn("t-display mt-1", QUALITY[tonight.quality].text)}>
            {QUALITY[tonight.quality].label}
          </p>
          <p className="mt-2 text-[1.0625rem] leading-snug">{tonight.reason}.</p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-haze">
            <span className="inline-flex items-center gap-1.5">
              <Thermometer className="size-4" aria-hidden /> {tonight.temperature}° at sunset
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CloudRain className="size-4" aria-hidden /> {tonight.rainChance}% rain
            </span>
          </p>
          <div className="mt-5 flex items-end gap-6">
            {(["high", "mid", "low"] as const).map((layer) => (
              <CloudBar key={layer} label={`${layer[0].toUpperCase()}${layer.slice(1)} clouds`} value={tonight.clouds[layer]} />
            ))}
          </div>
        </div>
      )}
      <ul className="mt-8 divide-y divide-dusk-edge border-t border-dusk-edge">
        {later.map((day, i) => (
          <li key={day.date} className="flex items-center gap-4 py-3.5">
            <span className="w-24 shrink-0">{weekday(day.date, i + 1)}</span>
            <span className="flex flex-1 items-end gap-1" aria-hidden>
              {(["high", "mid", "low"] as const).map((layer) => (
                <span key={layer} className="relative h-4 w-1.5 overflow-hidden rounded-full bg-dusk-edge">
                  <span className="absolute inset-x-0 bottom-0 bg-haze" style={{ height: `${day.clouds[layer]}%` }} />
                </span>
              ))}
            </span>
            <span className="text-haze tabular-nums">{day.sunset}</span>
            <span className={cn("w-12 text-right font-semibold", QUALITY[day.quality].text)}>
              {QUALITY[day.quality].label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.75rem] text-haze">
        Bars: high, mid and low clouds at sunset. Weather: Open-Meteo.com
      </p>
    </>
  );
}

/** One cloud layer at sunset, as a short vertical gauge. */
function CloudBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-end gap-2">
      <span className="relative block h-10 w-2 overflow-hidden rounded-full bg-dusk-edge">
        <span className="absolute inset-x-0 bottom-0 rounded-full bg-ink/80" style={{ height: `${value}%` }} />
      </span>
      <span className="text-[0.8125rem] leading-tight text-haze">
        <span className="block font-semibold text-ink tabular-nums">{value}%</span>
        {label}
      </span>
    </div>
  );
}
