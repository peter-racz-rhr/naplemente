"use client";

import { useEffect, useState } from "react";

/*
  Photos and videos attached to spots, kept in IndexedDB on this device
  (localStorage is far too small for video). Replace with Supabase Storage
  uploads once accounts are real.
*/
export type MediaRef = { id: string; kind: "image" | "video" };

const DB_NAME = "naplemente-media";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeMedia(file: File): Promise<MediaRef> {
  const ref: MediaRef = {
    id: crypto.randomUUID(),
    kind: file.type.startsWith("video/") ? "video" : "image",
  };
  await run("readwrite", (store) => store.put(file, ref.id));
  return ref;
}

export const deleteMedia = (id: string) =>
  run("readwrite", (store) => store.delete(id));

/** An object URL for a stored file, revoked when the component unmounts. */
export function useMediaUrl(id: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    run<Blob | undefined>("readonly", (store) => store.get(id))
      .then((blob) => {
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url;
}
