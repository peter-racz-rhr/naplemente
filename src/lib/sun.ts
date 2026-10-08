import { getPosition, getTimes } from "suncalc";
import { LOCALE } from "@/lib/locale";

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
  new Intl.DateTimeFormat(LOCALE, {
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

/**
 * The point on Earth where the sun is straight overhead right now. The line
 * 90° away from it is where the sun is rising and setting. Low-precision
 * almanac formulas, good to about 0.01°.
 */
export function subsolarPoint(date: Date) {
  const rad = Math.PI / 180;
  const n = date.getTime() / DAY_MS - 10957.5; // days since J2000.0
  const meanLongitude = 280.46 + 0.9856474 * n;
  const anomaly = (357.528 + 0.9856003 * n) * rad;
  const lambda = (meanLongitude + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * rad;
  const obliquity = (23.439 - 0.0000004 * n) * rad;
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(lambda), Math.cos(lambda)) / rad;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(lambda)) / rad;
  const siderealTime = 280.46061837 + 360.98564736629 * n;
  return {
    latitude: declination,
    longitude: ((((rightAscension - siderealTime) % 360) + 540) % 360) - 180,
  };
}

/**
 * Whether the sun is up at a place, by the same geometry as the sunset line
 * on the globe (centre of the sun 0.833° below the horizon, refraction included).
 */
export function isSunUp(latitude: number, longitude: number, subsolar: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180;
  const sinAltitude =
    Math.sin(latitude * rad) * Math.sin(subsolar.latitude * rad) +
    Math.cos(latitude * rad) * Math.cos(subsolar.latitude * rad) * Math.cos((longitude - subsolar.longitude) * rad);
  return sinAltitude > Math.sin(-0.833 * rad);
}
