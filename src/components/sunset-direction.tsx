"use client";

import type { CSSProperties } from "react";
import { getPosition } from "suncalc";
import { MapMarker, MarkerContent } from "@/components/ui/map";
import { useNow } from "@/lib/use-here";
import {
  compassPoint,
  formatClock,
  nextSunset,
  sunsetBearing,
} from "@/lib/sun";

type Light = {
  bearing: number;
  /** second, smaller label line */
  detail: string;
  /** rgb triplet for the glow */
  color: string;
  /** 0–1, how strongly the light glows */
  strength: number;
  /** degrees either side of the bearing */
  spread: number;
  label: string;
};

/**
 * Where the sunlight is coming from right now, and how strong it is.
 * High sun: bright and wide. Golden hour: warm and narrow. After dark: a
 * faint glow toward tomorrow's sunset.
 */
function currentLight(latitude: number, longitude: number, now: Date): Light | null {
  const { azimuth, altitude } = getPosition(now, latitude, longitude);
  const next = nextSunset(latitude, longitude, now);
  const sets =
    next.kind === "sunset"
      ? `Sets ${formatClock(next.at)} · ${compassPoint(sunsetBearing(latitude, longitude, next.at))}`
      : "";

  if (altitude > 6) {
    // Daylight: from soft gold low in the sky to near-white overhead.
    const high = Math.min(1, (altitude - 6) / 40);
    return {
      bearing: azimuth,
      color: high > 0.5 ? "255 236 190" : "255 205 120",
      strength: 0.55 + 0.35 * high,
      spread: 24 + 10 * high,
      label: `Sun ${Math.round(altitude)}° up`,
      detail: sets,
    };
  }
  if (altitude > -1) {
    // Golden hour into the sunset itself.
    return {
      bearing: azimuth,
      color: altitude > 2 ? "255 160 80" : "255 110 90",
      strength: 0.85,
      spread: 16,
      label: altitude > 0.5 ? "Golden hour" : "Sunset now",
      detail: altitude > 0.5 ? sets : "",
    };
  }
  if (next.kind === "sunset") {
    // Dark: a faint hint of where tomorrow's sun goes down.
    return {
      bearing: sunsetBearing(latitude, longitude, next.at),
      color: "240 100 140",
      strength: 0.35,
      spread: 12,
      label: "Next sunset",
      detail: `${formatClock(next.at)} · ${compassPoint(sunsetBearing(latitude, longitude, next.at))}`,
    };
  }
  return null;
}

/**
 * A soft fan of light from a point on the map toward the sun, with a label
 * at its tip. Must be rendered inside <Map>. It's drawn in screen pixels, so
 * it keeps the same size at any zoom, and taps pass through to the map.
 */
export function SunsetDirection({
  latitude,
  longitude,
  lengthPx = 130,
}: {
  latitude: number;
  longitude: number;
  lengthPx?: number;
}) {
  const now = useNow(60000);
  const light = currentLight(latitude, longitude, now);
  if (!light) return null;

  const size = lengthPx * 2;
  const s = light.spread;
  const mask = `conic-gradient(from ${-s}deg, transparent 0deg, black ${s * 0.6}deg, black ${s * 1.4}deg, transparent ${s * 2}deg, transparent 360deg)`;
  const fan: CSSProperties = {
    // Brightest at the source, fading out with distance...
    background: `radial-gradient(circle closest-side, rgb(${light.color} / ${light.strength}) 0%, rgb(${light.color} / ${light.strength * 0.55}) 35%, rgb(${light.color} / ${light.strength * 0.18}) 70%, transparent 100%)`,
    // ...and softly at the sides, so it reads as a beam, not a slice.
    maskImage: mask,
    WebkitMaskImage: mask,
    filter: "blur(2px)",
  };

  return (
    // The fan points up (north) and the marker turns it to the sun's bearing.
    <MapMarker
      latitude={latitude}
      longitude={longitude}
      rotation={light.bearing}
      rotationAlignment="map"
      className="sun-light"
    >
      <MarkerContent className="pointer-events-none cursor-default">
        <span aria-hidden className="relative block" style={{ width: size, height: size }}>
          <span className="absolute inset-0" style={fan} />
          {/* Label near the tip, turned back so it reads upright. */}
          <span
            className="absolute top-[12%] left-1/2 rounded-xl bg-night/80 px-2.5 py-1 text-center text-[0.75rem] leading-tight whitespace-nowrap text-ink"
            style={{ transform: `translate(-50%, -50%) rotate(${-light.bearing}deg)` }}
          >
            {light.label}
            {light.detail && <span className="block text-[0.6875rem] text-haze">{light.detail}</span>}
          </span>
        </span>
      </MarkerContent>
    </MapMarker>
  );
}

/**
 * A short, thin line from a saved spot toward where the sun sets from
 * there: just enough to compare spots at a glance. Must be inside <Map>,
 * rendered before the spot's own marker so the dot sits on top.
 */
export function SpotSunsetTick({
  latitude,
  longitude,
  lengthPx = 44,
}: {
  latitude: number;
  longitude: number;
  lengthPx?: number;
}) {
  const next = nextSunset(latitude, longitude);
  if (next.kind === "none") return null;
  const bearing = sunsetBearing(latitude, longitude, next.at);

  return (
    <MapMarker
      latitude={latitude}
      longitude={longitude}
      rotation={bearing}
      rotationAlignment="map"
      className="sun-light"
    >
      <MarkerContent className="pointer-events-none cursor-default">
        <span aria-hidden className="relative block" style={{ width: lengthPx * 2, height: lengthPx * 2 }}>
          <span
            className="absolute top-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full"
            style={{
              height: lengthPx,
              // Solid where it leaves the dot, fading out toward the tip.
              background:
                "linear-gradient(to top, rgb(255 181 77 / 0.95) 0%, rgb(255 181 77 / 0.95) 40%, rgb(255 122 61 / 0) 100%)",
            }}
          />
        </span>
      </MarkerContent>
    </MapMarker>
  );
}
