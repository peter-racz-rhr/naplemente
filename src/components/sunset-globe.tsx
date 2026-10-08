"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { Globe3DConfig, GlobeMarker } from "@/components/ui/3d-globe";

const Globe3D = dynamic(
  () => import("@/components/ui/3d-globe").then((m) => m.Globe3D),
  { ssr: false },
);

/** Warm dot used as the photo stand-in for each spot until real photos exist. */
const sunDot = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><radialGradient id="g" cx="50%" cy="70%" r="70%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs><circle cx="5" cy="5" r="5" fill="url(#g)"/></svg>`,
  )}`;

// A handful of well-loved sunset spots, so the planet doesn't feel empty.
const SPOTS: GlobeMarker[] = [
  { lat: 47.502, lng: 19.035, label: "Halászbástya, Budapest", src: sunDot("#ffd08a", "#ff7a3d") },
  { lat: 46.907, lng: 17.889, label: "Tihany, Balaton", src: sunDot("#ffd08a", "#f0648c") },
  { lat: 36.462, lng: 25.376, label: "Oia, Santorini", src: sunDot("#ffe2a8", "#ff7a3d") },
  { lat: 38.692, lng: -9.216, label: "Belém, Lisbon", src: sunDot("#ffd08a", "#f0648c") },
  { lat: -8.829, lng: 115.085, label: "Uluwatu, Bali", src: sunDot("#ffe2a8", "#ff7a3d") },
  { lat: -25.344, lng: 131.036, label: "Uluru", src: sunDot("#ffd08a", "#f0648c") },
  { lat: 24.555, lng: -81.807, label: "Mallory Square, Key West", src: sunDot("#ffe2a8", "#ff7a3d") },
  { lat: -33.957, lng: 18.384, label: "Camps Bay, Cape Town", src: sunDot("#ffd08a", "#f0648c") },
];

const CONFIG: Globe3DConfig = {
  textureUrl: "/textures/earth-day.jpg",
  bumpMapUrl: "/textures/earth-topology.jpg",
  nightTextureUrl: "/textures/earth-night.jpg",
  // Sun behind and to the right: a crescent of day with the sunset line
  // curving down the planet, and city lights on the night side.
  sunDirection: [1, 0.35, -0.6],
  terminatorColor: "#ff7a3d",
  showAtmosphere: false,
  autoRotateSpeed: 0.45,
  introSpinSpeed: 9,
  spinDownSeconds: 3.2,
  enableZoom: false,
  initialRotation: { x: 0, y: 0 },
};

const YOU_DOT = sunDot("#ffffff", "#ffb54d");

export function SunsetGlobe({
  className,
  onReady,
  you,
}: {
  className?: string;
  onReady?: () => void;
  /** The viewer's position, pinned once they share their location. */
  you?: { latitude: number; longitude: number } | null;
}) {
  const markers = useMemo(
    () =>
      you
        ? [
            ...SPOTS,
            { lat: you.latitude, lng: you.longitude, label: "You", src: YOU_DOT },
          ]
        : SPOTS,
    [you],
  );

  return (
    <Globe3D
      className={className}
      markers={markers}
      config={CONFIG}
      onReady={onReady}
      // Aim a little south of you: the globe sits low on the screen, so this
      // lifts your pin up into view.
      focus={you ? { lat: Math.max(you.latitude - 12, -80), lng: you.longitude } : null}
    />
  );
}
