"use client";

import { useCallback, useEffect, useState } from "react";
import { locationPermission, requestLocation, type Coordinates } from "./location";

type Status = "checking" | "prompt" | "locating" | "ready" | "denied";

/**
 * Where the viewer is. Reads the location silently when permission was
 * already given; otherwise waits for `request()` (call it from a button).
 */
export function useHere() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<Status>("checking");

  const request = useCallback(async () => {
    setStatus("locating");
    try {
      setCoords(await requestLocation());
      setStatus("ready");
    } catch {
      setStatus("denied");
    }
  }, []);

  useEffect(() => {
    void locationPermission().then((state) => {
      if (state === "granted") void request();
      else setStatus(state === "denied" ? "denied" : "prompt");
    });
  }, [request]);

  return { coords, status, request };
}

/** A clock that ticks every `ms`, for countdowns. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
  return now;
}
