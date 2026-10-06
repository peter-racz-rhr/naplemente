import { getPosition, getTimes } from "suncalc";

export type NextSunset =
  | { kind: "sunset"; at: Date; isToday: boolean }
  | { kind: "none" }; // polar day or night

const DAY_MS = 24 * 60 * 60 * 1000;

const valid = (date: Date | null) =>
  date && !Number.isNaN(date.getTime()) ? date : null;

/** Today's sunset, or tomorrow's if it already happened. */
export function nextSunset(
  latitude: number,
  longitude: number,
  now = new Date(),
): NextSunset {
  const today = valid(getTimes(now, latitude, longitude).sunset);
  if (today && today > now) return { kind: "sunset", at: today, isToday: true };

  const tomorrow = valid(
    getTimes(new Date(now.getTime() + DAY_MS), latitude, longitude).sunset,
  );
  if (tomorrow) return { kind: "sunset", at: tomorrow, isToday: false };
  return { kind: "none" };
}

/** "2h 14m", "14m" or "less than a minute". */
export function formatCountdown(ms: number) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "less than a minute";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export const formatClock = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

/** Headline and detail line for "how long until sunset here". */
export function describeSunset(
  coords: { latitude: number; longitude: number },
  now = new Date(),
) {
  const next = nextSunset(coords.latitude, coords.longitude, now);
  if (next.kind === "none") {
    return {
      headline: "No sunset here today",
      detail: "The sun stays above or below the horizon all day where you are.",
    };
  }
  const countdown = formatCountdown(next.at.getTime() - now.getTime());
  return next.isToday
    ? {
        headline: `Sunset in ${countdown}`,
        detail: `Today at ${formatClock(next.at)}, where you are.`,
      }
    : {
        headline: `Next sunset in ${countdown}`,
        detail: `Tomorrow at ${formatClock(next.at)}, where you are.`,
      };
}

/**
 * Compass bearing (degrees clockwise from north) to where the sun touches
 * the horizon at the given sunset. SunCalc 2 already reports azimuth this way.
 */
export function sunsetBearing(latitude: number, longitude: number, at: Date) {
  return getPosition(at, latitude, longitude).azimuth;
}

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export const compassPoint = (bearing: number) =>
  COMPASS[Math.round(bearing / 22.5) % 16];

/** The point `km` away from a start point along a bearing (great circle). */
export function destination(
  latitude: number,
  longitude: number,
  bearing: number,
  km: number,
): [number, number] {
  const R = 6371;
  const δ = km / R;
  const θ = (bearing * Math.PI) / 180;
  const φ1 = (latitude * Math.PI) / 180;
  const λ1 = (longitude * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return [(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI];
}
