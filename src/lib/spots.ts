"use client";

import { createLocalStore } from "./local-store";

export type Spot = {
  id: string;
  name: string;
  note: string;
  latitude: number;
  longitude: number;
  savedAt: string;
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
  store.set((spots) => spots.filter((spot) => spot.id !== id));
}
