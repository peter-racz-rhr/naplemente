"use client";

import { createLocalStore } from "./local-store";
import { deleteMedia, type MediaRef } from "./media-store";

export type Spot = {
  id: string;
  name: string;
  note: string;
  latitude: number;
  longitude: number;
  savedAt: string;
  media?: MediaRef[];
};

const store = createLocalStore<Spot[]>("naplemente:spots", []);

export const useSpots = store.useValue;

export function saveSpot(input: Omit<Spot, "id" | "savedAt">) {
  const spot: Spot = {
    ...input,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  store.set((spots) => [spot, ...spots]);
  return spot;
}

export function removeSpot(id: string) {
  const spot = store.get().find((s) => s.id === id);
  spot?.media?.forEach((m) => void deleteMedia(m.id));
  store.set((spots) => spots.filter((s) => s.id !== id));
}
