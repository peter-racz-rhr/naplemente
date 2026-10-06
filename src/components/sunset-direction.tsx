"use client";

import { useEffect, useState } from "react";
import { MapMarker, MapRoute, MarkerContent, useMap } from "@/components/ui/map";
import {
  compassPoint,
  destination,
  formatClock,
  nextSunset,
  sunsetBearing,
} from "@/lib/sun";

// MapLibre uses 512px tiles: metres per pixel at zoom 0 on the equator.
const METRES_PER_PX_Z0 = 78271.517;

/**
 * A glowing line from a point on the map toward where the sun will set,
 * with a small sun at its end. It keeps the same length on screen at any
 * zoom so the sun and its label stay in view. Must be rendered inside <Map>.
 */
export function SunsetDirection({
  latitude,
  longitude,
  lengthPx = 130,
  id = "sunset-direction",
}: {
  latitude: number;
  longitude: number;
  lengthPx?: number;
  id?: string;
}) {
  const { map } = useMap();
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    if (!map) return;
    // Follow the zoom live (pinch, fly-to), at most once per frame.
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setZoom(map.getZoom()));
    };
    update();
    map.on("zoom", update);
    return () => {
      cancelAnimationFrame(frame);
      map.off("zoom", update);
    };
  }, [map]);

  const next = nextSunset(latitude, longitude);
  if (next.kind === "none" || zoom === null) return null;

  const metresPerPx =
    (METRES_PER_PX_Z0 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
  const km = (lengthPx * metresPerPx) / 1000;
  const bearing = sunsetBearing(latitude, longitude, next.at);
  const end = destination(latitude, longitude, bearing, km);
  const line: [number, number][] = [[longitude, latitude], end];

  return (
    <>
      <MapRoute id={`${id}-glow`} coordinates={line} color="#ff7a3d" width={14} opacity={0.22} interactive={false} />
      <MapRoute id={`${id}-core`} coordinates={line} color="#ffb54d" width={3} opacity={0.95} interactive={false} />
      <MapMarker longitude={end[0]} latitude={end[1]}>
        <MarkerContent className="cursor-default">
          <span className="relative flex flex-col items-center">
            <span className="sun-mark block size-6 rounded-full shadow-[0_0_24px_6px_rgba(255,122,61,0.55)]" />
            <span className="absolute top-full mt-1.5 rounded-full bg-night/80 px-2.5 py-1 text-[0.75rem] whitespace-nowrap text-ink">
              Sunset {formatClock(next.at)} · {compassPoint(bearing)}
            </span>
          </span>
        </MarkerContent>
      </MapMarker>
    </>
  );
}
