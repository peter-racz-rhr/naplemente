"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { getMoonIllumination, getMoonPosition, getMoonTimes, getPosition, getTimes } from "suncalc";
import { formatClock } from "@/lib/sun";

// The 3D sun and moon load in the browser only.
const Sun3D = dynamic(() => import("./sky-bodies").then((m) => m.Sun3D), { ssr: false });
const Moon3D = dynamic(() => import("./sky-bodies").then((m) => m.Moon3D), { ssr: false });

/*
  The sky above you right now. The view faces the sun at midday (south in
  the northern hemisphere), so the sun rises on the left and sets on the right.
  Sun and moon sit at their real height and direction, the moon shows its
  real phase, and the colours follow the sun's altitude. It's redrawn every
  minute by the parent, so everything drifts the way it does outside.
*/

const HORIZON = 86; // % from the top of the panel
const SPAN = 270; // degrees of horizon shown across the width

// Sky colours by sun altitude: top, middle, horizon.
const SKY: { alt: number; top: string; mid: string; low: string }[] = [
  { alt: -18, top: "#000000", mid: "#02030a", low: "#060914" },
  { alt: -10, top: "#01020a", mid: "#090c22", low: "#1a1734" },
  { alt: -5, top: "#090c25", mid: "#272150", low: "#663a5e" },
  { alt: -1, top: "#141a3c", mid: "#57345f", low: "#dc6648" },
  { alt: 2, top: "#1c2a55", mid: "#954e5b", low: "#ff9853" },
  { alt: 8, top: "#21437a", mid: "#ab786a", low: "#ffc179" },
  { alt: 20, top: "#235995", mid: "#5b8ebf", low: "#a8cae0" },
  { alt: 60, top: "#1e5da7", mid: "#4e8ecf", low: "#9ec8eb" },
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) =>
  `rgb(${hex(a)
    .map((v, i) => Math.round(v + (hex(b)[i] - v) * t))
    .join(" ")})`;

function skyColours(alt: number) {
  if (alt <= SKY[0].alt) return SKY[0];
  for (let i = 1; i < SKY.length; i++) {
    if (alt <= SKY[i].alt) {
      const a = SKY[i - 1];
      const b = SKY[i];
      const t = (alt - a.alt) / (b.alt - a.alt);
      return { alt, top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), low: mix(a.low, b.low, t) };
    }
  }
  return SKY[SKY.length - 1];
}

/** Horizontal position (0–100) for a compass bearing, or null if out of view. */
function skyX(azimuth: number, facing: number) {
  const diff = ((azimuth - facing + 540) % 360) - 180;
  if (Math.abs(diff) > SPAN / 2) return null;
  return 50 + (diff / SPAN) * 100;
}

/** Vertical position (0–100) for an altitude in degrees (90° = top). */
const skyY = (altitude: number) => HORIZON - (Math.min(altitude, 90) / 90) * (HORIZON - 6);

// Fixed star field (same every render).
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: r(1) * 100, y: r(2) * (HORIZON - 6), size: 0.5 + r(3) * 1.3, o: 0.35 + r(4) * 0.65 };
});

export function LiveSky({
  latitude,
  longitude,
  now,
  children,
}: {
  latitude: number;
  longitude: number;
  now: Date;
  children?: ReactNode;
}) {
  const sun = getPosition(now, latitude, longitude);
  const moon = getMoonPosition(now, latitude, longitude);
  const illumination = getMoonIllumination(now);
  const times = getTimes(now, latitude, longitude);
  const colours = skyColours(sun.altitude);
  // Face wherever the sun is at midday: south in most of the northern
  // hemisphere, north in the south, and either near the equator.
  const noonAzimuth = times.solarNoon
    ? getPosition(times.solarNoon, latitude, longitude).azimuth
    : latitude >= 0 ? 180 : 0;
  const facing = Math.abs(((noonAzimuth - 180 + 540) % 360) - 180) < 90 ? 180 : 0;
  const night = Math.min(1, Math.max(0, (-sun.altitude - 4) / 10));

  const sunX = skyX(sun.azimuth, facing);
  const moonX = skyX(moon.azimuth, facing);
  const sunUp = sun.altitude > -1 && sunX !== null;
  const moonUp = moon.altitude > -1 && moonX !== null;
  const low = Math.max(0, Math.min(1, 1 - sun.altitude / 15));

  // When the moon is down at night, say when it comes up.
  let moonrise: Date | null = null;
  if (!moonUp && sun.altitude < -6) {
    const today = getMoonTimes(now, latitude, longitude).rise;
    moonrise =
      today && today > now
        ? today
        : (getMoonTimes(new Date(now.getTime() + 864e5), latitude, longitude).rise ?? null);
  }

  return (
    <div
      className="relative h-[max(56dvh,22rem)] overflow-hidden"
      style={{
        // The sky fades into the page instead of ending at a hard horizon.
        background: `linear-gradient(to bottom, ${colours.top} 0%, ${colours.mid} 45%, ${colours.low} 72%, #000 100%)`,
        transition: "background 2s linear",
      }}
    >
      {/* Soft fade to the page at the bottom (under the sun and moon) */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-night" />

      {/* Stars fade in as it gets dark */}
      <svg aria-hidden className="absolute inset-0 h-full w-full" style={{ opacity: night }}>
        {STARS.map((s, i) => (
          <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.size} fill="#fff" opacity={s.o} />
        ))}
      </svg>

      {/* Moon: a lit 3D sphere in its real phase */}
      {moonUp && (
        <div
          aria-hidden
          // Screen blending: only the lit part adds light, the dark side is
          // invisible against the sky, as it is in real life.
          className="absolute -translate-x-1/2 -translate-y-1/2 mix-blend-screen transition-[left,top] duration-[2s] ease-linear"
          style={{ left: `${moonX}%`, top: `${skyY(moon.altitude)}%` }}
        >
          <Moon3D phase={illumination.phase} mirror={facing !== 180} size={76} />
        </div>
      )}

      {/* Sun: a glowing 3D sphere, warmer and bigger near the horizon */}
      {sunUp && (
        <div
          aria-hidden
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,top] duration-[2s] ease-linear"
          style={{
            left: `${sunX}%`,
            top: `${skyY(sun.altitude)}%`,
            boxShadow: `0 0 ${50 + 40 * low}px ${14 + 14 * low}px ${mix("#fff2cf", "#ff7a3d", low).slice(0, -1)} / 0.5)`,
          }}
        >
          <Sun3D warmth={low} size={Math.round(58 + 16 * low)} />
        </div>
      )}

      {moonrise && (
        <p className="absolute right-6 bottom-4 text-[0.8125rem] text-haze">
          Moon rises at {formatClock(moonrise)}
        </p>
      )}

      <div className="relative">{children}</div>
    </div>
  );
}
