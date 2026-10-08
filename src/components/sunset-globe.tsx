"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { Globe3DConfig, GlobeMarker } from "@/components/ui/3d-globe";

const Globe3D = dynamic(
  () => import("@/components/ui/3d-globe").then((m) => m.Globe3D),
  { ssr: false },
);

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

export function SunsetGlobe({
  className,
  onReady,
  you,
}: {
  className?: string;
  onReady?: () => void;
  /** The viewer's position, shown as a dot once they share their location. */
  you?: { latitude: number; longitude: number } | null;
}) {
  // Nothing on the planet but a small dot where you are.
  const markers = useMemo<GlobeMarker[]>(
    () => (you ? [{ lat: you.latitude, lng: you.longitude, label: "You", src: "", dot: true }] : []),
    [you],
  );

  return (
    <Globe3D
      className={className}
      markers={markers}
      config={CONFIG}
      onReady={onReady}
      // Aim a little south of you: the globe sits low on the screen, so this
      // lifts your dot up into view.
      focus={you ? { lat: Math.max(you.latitude - 12, -80), lng: you.longitude } : null}
    />
  );
}
