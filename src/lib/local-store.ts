"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny persisted store: state lives in localStorage on this device and
 * every component using it re-renders when it changes.
 * Swap for Supabase tables once accounts are real.
 */
export function createLocalStore<T>(key: string, initial: T) {
  let cache: T | null = null;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (cache !== null) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      cache = initial;
    }
    return cache;
  };

  const set = (update: T | ((prev: T) => T)) => {
    const next =
      typeof update === "function"
        ? (update as (prev: T) => T)(read())
        : update;
    cache = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage full or blocked: keep the in-memory value for this visit.
    }
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const useValue = () =>
    useSyncExternalStore(subscribe, read, () => initial);

  return { get: read, set, useValue };
}
