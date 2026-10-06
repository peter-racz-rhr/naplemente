"use client";

import { useEffect, useState } from "react";
import { locationPermission, requestLocation, type Coordinates } from "./location";
import { describeSunset } from "./sun";

/**
 * Sunset countdown for wherever the viewer is, but only if they already
 * allowed location (we never prompt from here). Refreshes every 30 seconds.
 */
export function useSunsetHere() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    void locationPermission().then(async (state) => {
      if (state !== "granted") return;
      try {
        const position = await requestLocation();
        if (!cancelled) setCoords(position);
      } catch {
        // Location failed; the screen simply shows no countdown.
      }
    });
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return coords ? describeSunset(coords, now) : null;
}
