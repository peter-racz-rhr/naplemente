import { getTimes } from "suncalc";

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
