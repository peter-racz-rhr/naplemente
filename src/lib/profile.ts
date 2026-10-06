"use client";

import { createLocalStore } from "./local-store";

const nameStore = createLocalStore<string>("naplemente:name", "");

export const useDisplayName = nameStore.useValue;
export const setDisplayName = (name: string) => nameStore.set(name);
