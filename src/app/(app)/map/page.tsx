"use client";

import "@/lib/maplibre-worker";
import { ChevronRight, ImagePlus, LocateFixed, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/avatar";
import { MediaThumb } from "@/components/media-thumb";
import { SpotSunsetTick, SunsetDirection } from "@/components/sunset-direction";
import { Field } from "@/components/onboarding/field";
import { FORWARD, PageTransition } from "@/components/page-transition";
import { LiquidIconButton } from "@/components/ui/liquid-icon-button";
import { LiquidSurface } from "@/components/ui/liquid-surface";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
  type MapRef,
} from "@/components/ui/map";
import { PEOPLE } from "@/lib/demo-people";
import { postForPerson } from "@/lib/demo-posts";
import { storeMedia } from "@/lib/media-store";
import { useFriendIds } from "@/lib/social";
import { postSpotHref, spotHref } from "@/lib/spot-detail";
import { saveSpot, useSpots } from "@/lib/spots";
import { formatClock, nextSunset } from "@/lib/sun";
import { useHere } from "@/lib/use-here";
import { cn } from "@/lib/utils";

const noSubscription = () => () => {};

// Budapest, until we know where you are.
const FALLBACK_CENTER: [number, number] = [19.04, 47.5];
const MAX_FILE_MB = 60;

type Draft = { latitude: number; longitude: number };

function SunsetLine({ latitude, longitude }: Draft) {
  const next = nextSunset(latitude, longitude);
  if (next.kind === "none") return <>No sunset here today</>;
  return (
    <>
      Sunset {next.isToday ? "today" : "tomorrow"} at {formatClock(next.at)}
    </>
  );
}

function OpenSpotLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      transitionTypes={FORWARD}
      className="mt-3 inline-flex items-center gap-0.5 text-sm font-semibold text-ink"
    >
      Open spot <ChevronRight className="size-4" aria-hidden />
    </Link>
  );
}

/**
 * Tapping empty map starts saving a spot there. A tap that lands on a marker,
 * or that only closes an open popup, is left alone.
 */
function TapToSave({ onTap }: { onTap: (draft: Draft) => void }) {
  const { map } = useMap();
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  });

  useEffect(() => {
    if (!map) return;
    let popupWasOpen = false;
    const down = () => {
      popupWasOpen = Boolean(document.querySelector(".maplibregl-popup"));
    };
    const click = (event: { lngLat: { lat: number; lng: number }; originalEvent: Event }) => {
      const target = event.originalEvent.target as Element | null;
      if (popupWasOpen || target?.closest(".maplibregl-marker, .maplibregl-popup")) return;
      onTapRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    };
    map.on("mousedown", down);
    map.on("touchstart", down);
    map.on("click", click);
    return () => {
      map.off("mousedown", down);
      map.off("touchstart", down);
      map.off("click", click);
    };
  }, [map]);

  return null;
}

export default function MapPage() {
  const mapRef = useRef<MapRef>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const here = useHere();
  const spots = useSpots();
  const friendIds = useFriendIds();
  const friends = PEOPLE.filter((p) => friendIds.includes(p.id));

  const dockSlot = useSyncExternalStore(
    noSubscription,
    () => document.getElementById("dock-accessory"),
    () => null,
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  // Fly to you once we know where you are.
  const flownRef = useRef(false);
  useEffect(() => {
    if (!here.coords || flownRef.current) return;
    flownRef.current = true;
    mapRef.current?.flyTo({
      center: [here.coords.longitude, here.coords.latitude],
      zoom: 12,
      duration: 1800,
    });
  }, [here.coords]);

  // While the save sheet is open the dock steps aside, and the keyboard
  // slides over the sheet instead of pushing it up. Android Chrome reads
  // this from the viewport meta tag (interactive-widget) and the
  // VirtualKeyboard API; both are switched back when the sheet closes so
  // the chat bar still rises above the keyboard.
  const sheetOpen = draft !== null;
  useEffect(() => {
    if (!sheetOpen) return;
    const root = document.documentElement;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const originalViewport = meta?.content;
    const keyboard = (navigator as Navigator & {
      virtualKeyboard?: { overlaysContent: boolean };
    }).virtualKeyboard;

    root.dataset.sheet = "open";
    if (meta && originalViewport && !originalViewport.includes("interactive-widget")) {
      meta.content = `${originalViewport}, interactive-widget=overlays-content`;
    }
    if (keyboard) keyboard.overlaysContent = true;

    return () => {
      delete root.dataset.sheet;
      if (meta && originalViewport !== undefined) meta.content = originalViewport;
      if (keyboard) keyboard.overlaysContent = false;
    };
  }, [sheetOpen]);

  // Preview URLs are freed when a file is removed, the sheet closes, or we leave.
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);
  const clearFiles = () => {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
  };
  const removeFile = (url: string) => {
    URL.revokeObjectURL(url);
    setFiles((list) => list.filter((f) => f.url !== url));
  };
  const closeSheet = () => {
    clearFiles();
    setDraft(null);
  };

  const locate = async () => {
    if (here.coords) {
      mapRef.current?.flyTo({
        center: [here.coords.longitude, here.coords.latitude],
        zoom: 14,
        duration: 1200,
      });
    } else {
      flownRef.current = false;
      await here.request();
    }
  };

  const startDraft = (next: Draft) => {
    if (!draft) {
      setName("");
      setNote("");
      clearFiles();
      setError(null);
    }
    setDraft(next);
    // Keep the pin in view above the sheet.
    mapRef.current?.easeTo({
      center: [next.longitude, next.latitude],
      offset: [0, -150],
      duration: 500,
    });
  };

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((file) => {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`${file.name} is over ${MAX_FILE_MB} MB.`);
        return false;
      }
      return file.type.startsWith("image/") || file.type.startsWith("video/");
    });
    setFiles((current) => [
      ...current,
      ...picked.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    if (!name.trim()) {
      setError("Give the spot a name.");
      return;
    }
    setBusy(true);
    try {
      const media = await Promise.all(files.map((f) => storeMedia(f.file)));
      const spot = saveSpot({ name: name.trim(), note: note.trim(), ...draft, media });
      closeSheet();
      setJustSaved(spot.name);
      window.setTimeout(() => setJustSaved(null), 2600);
    } catch {
      setError("Couldn't save the photos on this device. Try fewer or smaller files.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageTransition>
      {/* Sized to the large viewport (lvh), not the visible one, so if the
          keyboard still shrinks the screen the map and sheet stay where they are. */}
      <main className="fixed inset-x-0 top-0 h-lvh bg-night">
        <Map
          ref={mapRef}
          theme="dark"
          center={here.coords ? [here.coords.longitude, here.coords.latitude] : FALLBACK_CENTER}
          zoom={here.coords ? 12 : 5}
          className="h-full w-full"
        >
          <TapToSave onTap={startDraft} />

          {/* Short sunset lines first, so the spot dots sit on top of them */}
          {friends.map((person) => (
            <SpotSunsetTick key={`tick-${person.id}`} {...person.spot} />
          ))}
          {spots.map((spot) => (
            <SpotSunsetTick key={`tick-${spot.id}`} latitude={spot.latitude} longitude={spot.longitude} />
          ))}

          {friends.map((person) => (
            <MapMarker key={person.id} latitude={person.spot.latitude} longitude={person.spot.longitude}>
              <MarkerContent>
                <Avatar
                  name={person.name}
                  colors={person.colors}
                  className="size-8 text-[0.6875rem] ring-2 ring-night"
                />
              </MarkerContent>
              <MarkerPopup className="w-60 rounded-[1.25rem] border-dusk-edge p-4">
                <p className="font-semibold">{person.spot.name}</p>
                <p className="mt-0.5 text-sm text-haze">Saved by {person.name.split(" ")[0]}</p>
                <p className="mt-2 text-sm text-gold">
                  <SunsetLine {...person.spot} />
                </p>
                <OpenSpotLink href={postSpotHref(postForPerson(person.id)?.id ?? "")} />
              </MarkerPopup>
            </MapMarker>
          ))}

          {spots.map((spot) => (
            <MapMarker key={spot.id} latitude={spot.latitude} longitude={spot.longitude}>
              <MarkerContent>
                <span className="sun-mark block size-7 rounded-full ring-2 ring-night" />
              </MarkerContent>
              <MarkerPopup className="w-64 rounded-[1.25rem] border-dusk-edge p-3">
                {spot.media?.[0] && (
                  <MediaThumb media={spot.media[0]} controls className="mb-3 aspect-[4/3] w-full" />
                )}
                {spot.media && spot.media.length > 1 && (
                  <div className="-mt-1 mb-3 flex gap-1.5 overflow-x-auto">
                    {spot.media.slice(1).map((m) => (
                      <MediaThumb key={m.id} media={m} className="size-12 shrink-0 rounded-xl" />
                    ))}
                  </div>
                )}
                <div className="px-1">
                  <p className="font-semibold">{spot.name}</p>
                  {spot.note && <p className="mt-0.5 text-sm text-haze">{spot.note}</p>}
                  <p className="mt-2 text-sm text-gold">
                    <SunsetLine {...spot} />
                  </p>
                  <OpenSpotLink href={spotHref(spot.id)} />
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}

          {/* Where the sunlight comes from, and how strong it is */}
          {here.coords && <SunsetDirection {...here.coords} />}

          {here.coords && (
            <MapMarker latitude={here.coords.latitude} longitude={here.coords.longitude}>
              <MarkerContent>
                <span className="relative block size-4 rounded-full bg-ink ring-4 ring-gold/40" />
              </MarkerContent>
            </MapMarker>
          )}

          {draft && (
            <MapMarker latitude={draft.latitude} longitude={draft.longitude} anchor="bottom">
              <MarkerContent>
                <span className="flex flex-col items-center animate-in fade-in zoom-in-75 slide-in-from-top-3 duration-300">
                  <span className="sun-mark block size-9 rounded-full ring-4 ring-night" />
                  <span className="h-4 w-0.5 bg-ink" />
                </span>
              </MarkerContent>
            </MapMarker>
          )}
        </Map>

        {/* Center on me: placed in the dock's accessory slot so it always sits
            right above the dock's right edge, and hides along with it. */}
        {dockSlot &&
          createPortal(
            <LiquidIconButton label="Show where I am" shape="circle" size="lg" onClick={locate}>
              <LocateFixed className={cn("size-5", here.status === "locating" && "animate-pulse")} />
            </LiquidIconButton>,
            dockSlot,
          )}

        {justSaved && (
          <div className="absolute inset-x-0 top-[max(env(safe-area-inset-top),0.75rem)] z-20 flex justify-center px-6">
            <LiquidSurface
              radius={999}
              veil={0.45}
              role="status"
              className="px-5 py-3 text-center [text-shadow:0_1px_8px_rgb(0_0_0/0.55)] animate-in fade-in slide-in-from-top-2"
            >
              Saved {justSaved}
            </LiquidSurface>
          </div>
        )}

        {/* Save sheet */}
        {draft && (
          <form
            noValidate
            onSubmit={submit}
            className="absolute inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-[1.75rem] border-t border-dusk-edge bg-dusk px-5 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)] animate-in slide-in-from-bottom duration-300 ease-out"
          >
            <div aria-hidden className="mx-auto mb-2 h-1 w-10 rounded-full bg-dusk-edge" />
            <div className="flex items-center justify-between">
              <h2 className="t-section">Save this spot</h2>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Cancel"
                className="-mr-2 grid size-10 place-items-center rounded-full text-haze hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gold">
              <SunsetLine {...draft} />
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <Field
                label="Name"
                hideLabel
                placeholder="Name, like Hilltop bench"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="[&_input]:bg-night"
              />
              <Field
                label="Note"
                hideLabel
                placeholder="Note (optional): how to get there"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="[&_input]:bg-night"
              />

              <div className="flex gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="grid size-16 shrink-0 place-items-center rounded-2xl border border-dashed border-dusk-edge bg-night text-haze hover:text-ink"
                  aria-label="Add photos or videos"
                >
                  <ImagePlus className="size-6" />
                </button>
                {files.map((f) => (
                  <div key={f.url} className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
                    {f.file.type.startsWith("video/") ? (
                      <video src={f.url} muted playsInline className="h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- local preview
                      <img src={f.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => removeFile(f.url)}
                      className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/70 text-white"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    pickFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="h-14 rounded-full bg-ink text-[1.0625rem] font-semibold text-night transition-transform active:scale-[0.97] disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save spot"}
              </button>
            </div>
          </form>
        )}
      </main>
    </PageTransition>
  );
}
