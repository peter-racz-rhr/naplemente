"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { getTimes } from "suncalc";
import type { GlobeDot } from "@/components/world-globe";
import { formatClock, formatCountdown, isSunUp, nextSunset, subsolarPoint } from "@/lib/sun";
import { cn } from "@/lib/utils";
import { CITIES, type City } from "@/lib/world-cities";
import { LOCALE } from "@/lib/locale";

const WorldGlobe = dynamic(() => import("./world-globe").then((m) => m.WorldGlobe), { ssr: false });

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Place = City & {
  /** Next sunset, or null during polar day or night. */
  next: Date | null;
  /** When the sun went down, if that was in the last hour. */
  justSet: Date | null;
  tone: GlobeDot["tone"];
};

function describePlace(city: City, now: Date, you = false): Place {
  const next = nextSunset(city.latitude, city.longitude, now);
  const at = next.kind === "sunset" ? next.at : null;
  const last = [now, new Date(now.getTime() - DAY)]
    .map((d) => getTimes(d, city.latitude, city.longitude).sunset)
    .find((d): d is Date => !!d && d <= now);
  const justSet = last && now.getTime() - last.getTime() < HOUR ? last : null;
  const sunUp = isSunUp(city.latitude, city.longitude, subsolarPoint(now));
  const tone = you ? "you" : at && sunUp && at.getTime() - now.getTime() < HOUR ? "setting" : sunUp ? "day" : "night";
  return { ...city, next: at, justSet, tone };
}

/** Clock time in the city's own time zone (or the phone's, for "you"). */
const localClock = (date: Date, timeZone: string) =>
  timeZone
    ? new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit", timeZone }).format(date)
    : formatClock(date);

function sentence(place: Place, now: Date) {
  if (place.justSet) {
    return `The sun went down ${formatCountdown(now.getTime() - place.justSet.getTime())} ago, at ${localClock(place.justSet, place.timeZone)} local time.`;
  }
  if (!place.next) return "No sunset there today: the sun stays up, or down, all day.";
  const wait = place.next.getTime() - now.getTime();
  if (wait < 60 * 1000) return "The sun is going down right now.";
  return `The sun sets at ${localClock(place.next, place.timeZone)} local time, in ${formatCountdown(wait)}.`;
}

/**
 * The Earth with tonight's sunset line on it, the big cities that are next
 * to see the sun go down, and when.
 */
export function WorldSunsets({
  now,
  you,
}: {
  now: Date;
  you: { latitude: number; longitude: number } | null;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [focus, setFocus] = useState(0);
  const [ready, setReady] = useState(false);
  const labels = useRef(new Map<string, HTMLDivElement>());

  const places = useMemo(() => {
    const list = CITIES.map((city) => describePlace(city, now));
    if (you) list.push(describePlace({ id: "you", name: "You", timeZone: "", ...you }, now, true));
    return list;
  }, [now, you]);

  const upcoming = useMemo(
    () =>
      places
        .filter((p): p is Place & { next: Date } => p.id !== "you" && !!p.next)
        .sort((a, b) => a.next.getTime() - b.next.getTime()),
    [places],
  );

  // Until you pick one, follow whichever city is next to see the sunset.
  const selected = places.find((p) => p.id === picked) ?? upcoming[0] ?? places[0];
  const sun = useMemo(() => subsolarPoint(now), [now]);
  const dots = useMemo<GlobeDot[]>(
    () => places.map(({ id, latitude, longitude, tone }) => ({ id, latitude, longitude, tone })),
    [places],
  );
  const selectedDot = dots.find((d) => d.id === selected.id) ?? null;

  const pick = useCallback((id: string) => {
    setPicked(id);
    setFocus((n) => n + 1);
  }, []);
  // Once you've turned the globe yourself, stop following the next sunset.
  const turned = useCallback(() => setPicked((id) => id ?? selected.id), [selected.id]);
  const placeLabel = useCallback((id: string, x: number, y: number, opacity: number) => {
    const el = labels.current.get(id);
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = String(opacity);
  }, []);
  const onReady = useCallback(() => setReady(true), []);

  const when = selected.justSet ?? selected.next;

  return (
    <>
      <div
        role="img"
        aria-label="The Earth, lit by the sun as it is right now. The glowing line is where the sun is setting."
        className={cn(
          "relative -mx-6 mt-2 aspect-square cursor-grab overflow-hidden transition-opacity duration-700 active:cursor-grabbing",
          ready ? "opacity-100" : "opacity-0",
        )}
      >
        <WorldGlobe
          dots={dots}
          sun={sun}
          selected={selectedDot}
          focus={focus}
          onLabel={placeLabel}
          onPick={pick}
          onTurn={turned}
          onReady={onReady}
        />
        {/* Labels the globe keeps over the cities: the picked one with its
            local sunset time, the rest by name once you zoom in. */}
        {places.map((place) => (
          <div
            key={place.id}
            ref={(el) => {
              if (el) labels.current.set(place.id, el);
              else labels.current.delete(place.id);
            }}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 opacity-0"
          >
            {place.id === selected.id ? (
              <div className="-translate-x-1/2 -translate-y-full pb-5 text-center leading-tight whitespace-nowrap [text-shadow:0_1px_8px_rgb(0_0_0/0.9)]">
                <span className="block text-[0.9375rem] font-semibold">{place.name}</span>
                {when && (
                  <span className="block text-[0.8125rem] text-gold tabular-nums">
                    {localClock(when, place.timeZone)}
                  </span>
                )}
              </div>
            ) : place.id === "you" ? null : (
              <span className="block -translate-x-1/2 -translate-y-full pb-2 text-[0.75rem] whitespace-nowrap text-ink/85 [text-shadow:0_1px_6px_rgb(0_0_0/0.9)]">
                {place.name}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* The picked city in words */}
      <div aria-live="polite" className="mt-1">
        <p className="t-card-title">{selected.id === "you" ? "Where you are" : selected.name}</p>
        <p className="mt-1.5 text-[1.0625rem] leading-snug text-haze">{sentence(selected, now)}</p>
      </div>

      {/* Who's next */}
      <h3 className="mt-8 text-[0.875rem] text-haze">Next sunsets</h3>
      <ul className="mt-2 divide-y divide-dusk-edge border-y border-dusk-edge">
        {upcoming.slice(0, 5).map((place) => {
          const wait = place.next.getTime() - now.getTime();
          const isPicked = place.id === selected.id;
          return (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => pick(place.id)}
                aria-pressed={isPicked}
                className="flex w-full items-center gap-3 py-3.5 text-left"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    place.tone === "setting" ? "bg-gold" : "bg-ink/40",
                  )}
                />
                <span className={cn("flex-1 font-semibold", isPicked && "text-gold")}>{place.name}</span>
                <span className="text-haze tabular-nums">{localClock(place.next, place.timeZone)}</span>
                <span className="w-20 text-right tabular-nums">
                  {wait < 60 * 1000 ? "now" : `in ${formatCountdown(wait)}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[0.75rem] text-haze">Times are local to each city.</p>
    </>
  );
}
