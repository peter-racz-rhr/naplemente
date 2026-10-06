import * as MapLibreGL from "maplibre-gl";

// Must run before components/ui/map.tsx, which otherwise points at unpkg.
// The files are copied into public/ by scripts/copy-maplibre-worker.mjs.
if (typeof window !== "undefined") {
  MapLibreGL.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
}
