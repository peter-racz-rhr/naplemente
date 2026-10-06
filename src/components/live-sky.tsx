"use client";

import type { ReactNode } from "react";
import { getMoonIllumination, getMoonPosition, getPosition, getTimes } from "suncalc";
import { formatClock } from "@/lib/sun";

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

/** The lit part of the moon for its phase, as an SVG path in a unit circle. */
function moonPath(fraction: number) {
  const rx = Math.abs(1 - 2 * fraction);
  const sweep = fraction < 0.5 ? 0 : 1;
  // Right half of the disc, closed by the terminator ellipse.
  return `M0,-1 A1,1 0 0 1 0,1 A${rx},1 0 0 ${sweep} 0,-1 Z`;
}

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

  // Today's path of the sun, sunrise to sunset, split wherever it leaves
  // the view so it never draws a line across the sky.
  const paths: string[][] = [[]];
  if (times.sunrise && times.sunset) {
    let lastX: number | null = null;
    for (let t = times.sunrise.getTime(); t <= times.sunset.getTime(); t += 5 * 60000) {
      const p = getPosition(new Date(t), latitude, longitude);
      const x = skyX(p.azimuth, facing);
      if (x === null || (lastX !== null && Math.abs(x - lastX) > 20)) paths.push([]);
      if (x !== null) paths[paths.length - 1].push(`${x.toFixed(2)},${skyY(p.altitude).toFixed(2)}`);
      lastX = x;
    }
  }
  const sunsetX =
    times.sunset ? skyX(getPosition(times.sunset, latitude, longitude).azimuth, facing) : null;

  const sunX = skyX(sun.azimuth, facing);
  const moonX = skyX(moon.azimuth, facing);
  const sunUp = sun.altitude > -1 && sunX !== null;
  const moonUp = moon.altitude > -1 && moonX !== null;
  const low = Math.max(0, Math.min(1, 1 - sun.altitude / 15));
  // Looking north (southern hemisphere) the lit side is mirrored.
  const moonFlip = (illumination.waxing ? 1 : -1) * (facing === 180 ? 1 : -1);

  return (
    <div
      className="relative h-[max(56dvh,22rem)] overflow-hidden"
      style={{
        background: `linear-gradient(to bottom, ${colours.top} 0%, ${colours.mid} 52%, ${colours.low} ${HORIZON}%, #000 ${HORIZON + 0.1}%)`,
        transition: "background 2s linear",
      }}
    >
      {/* Stars fade in as it gets dark */}
      <svg aria-hidden className="absolute inset-0 h-full w-full" style={{ opacity: night }}>
        {STARS.map((s, i) => (
          <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.size} fill="#fff" opacity={s.o} />
        ))}
      </svg>

      {/* Today's arc of the sun */}
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {paths
          .filter((p) => p.length > 1)
          .map((p, i) => (
            <polyline
              key={i}
              points={p.join(" ")}
              fill="none"
              stroke="rgb(255 220 170 / 0.35)"
              strokeWidth={1.2}
              strokeDasharray="1.5 5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </svg>

      {/* Moon, in its real phase */}
      {moonUp && (
        <div
          aria-hidden
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-[2s] ease-linear"
          style={{ left: `${moonX}%`, top: `${skyY(moon.altitude)}%` }}
        >
          <svg viewBox="-1.2 -1.2 2.4 2.4" className="size-9 drop-shadow-[0_0_10px_rgba(220,225,255,0.35)]">
            <circle r={1} fill="rgb(255 255 255 / 0.08)" />
            <path d={moonPath(illumination.fraction)} fill="#eef0f6" transform={`scale(${moonFlip},1)`} />
          </svg>
        </div>
      )}

      {/* Sun, warmer and bigger near the horizon */}
      {sunUp && (
        <div
          aria-hidden
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,top] duration-[2s] ease-linear"
          style={{
            left: `${sunX}%`,
            top: `${skyY(sun.altitude)}%`,
            width: 26 + 10 * low,
            height: 26 + 10 * low,
            background: `radial-gradient(circle at 45% 40%, #fffaf0, ${mix("#ffe9b8", "#ff8a4c", low)} 70%)`,
            boxShadow: `0 0 ${30 + 30 * low}px ${8 + 10 * low}px ${mix("#fff2cf", "#ff7a3d", low).slice(0, -1)} / 0.55)`,
          }}
        />
      )}

      {/* The ground, and where the sun goes down today */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 bg-night"
        style={{ top: `${HORIZON}%`, boxShadow: "0 -1px 0 rgb(255 255 255 / 0.08)" }}
      />
      {sunsetX !== null && times.sunset && (
        <div
          aria-hidden
          className="absolute -translate-x-1/2 text-center"
          style={{ left: `${sunsetX}%`, top: `${HORIZON}%` }}
        >
          <span className="mx-auto block h-2 w-px bg-gold/80" />
          <span className="mt-1 block text-[0.75rem] text-gold tabular-nums">
            {formatClock(times.sunset)}
          </span>
        </div>
      )}

      <div className="relative">{children}</div>
    </div>
  );
}
