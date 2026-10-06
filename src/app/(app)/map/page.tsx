"use client";

import "@/lib/maplibre-worker";
import { ImagePlus, LocateFixed, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/avatar";
import { MediaThumb } from "@/components/media-thumb";
import { Field } from "@/components/onboarding/field";
import { PageTransition } from "@/components/page-transition";
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
import { storeMedia } from "@/lib/media-store";
import { useFriendIds } from "@/lib/social";
import { removeSpot, saveSpot, useSpots } from "@/lib/spots";
import { formatClock, nextSunset } from "@/lib/sun";
import { useHere } from "@/lib/use-here";
import { cn } from "@/lib/utils";

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
    mapRef.current?.easeTo({ center: [next.longitude, next.latitude], duration: 500 });
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

  const bottomOffset = "bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+6rem)]";

  return (
    <PageTransition>
      <main className="fixed inset-0 bg-night">
        <Map
          ref={mapRef}
          theme="dark"
          center={here.coords ? [here.coords.longitude, here.coords.latitude] : FALLBACK_CENTER}
          zoom={here.coords ? 12 : 5}
          className="h-full w-full"
        >
          <TapToSave onTap={startDraft} />

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
                  <button
                    type="button"
                    onClick={() => removeSpot(spot.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-error"
                  >
                    <Trash2 className="size-4" aria-hidden /> Remove spot
                  </button>
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}

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

        {/* Top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <LiquidSurface radius={999} veil={0.45} className="pointer-events-auto px-4 py-2.5 text-[0.9375rem] [text-shadow:0_1px_8px_rgb(0_0_0/0.55)]">
            {draft
              ? "Tap somewhere else to move the pin"
              : spots.length === 0
                ? "Tap the map to save a spot"
                : `${spots.length} saved ${spots.length === 1 ? "spot" : "spots"} · tap to add`}
          </LiquidSurface>
          <LiquidIconButton
            label="Show where I am"
            shape="circle"
            size="lg"
            onClick={locate}
            className="pointer-events-auto shrink-0"
          >
            <LocateFixed className={cn("size-5", here.status === "locating" && "animate-pulse")} />
          </LiquidIconButton>
        </div>

        {justSaved && (
          <LiquidSurface
            radius={999}
            veil={0.45}
            role="status"
            className={cn(
              "absolute inset-x-10 z-20 px-4 py-3 text-center animate-in fade-in slide-in-from-bottom-2",
              bottomOffset,
            )}
          >
            Saved {justSaved}
          </LiquidSurface>
        )}

        {/* Save sheet */}
        {draft && (
          <form
            noValidate
            onSubmit={submit}
            className={cn(
              "absolute inset-x-3 z-20 rounded-[1.75rem] border border-dusk-edge bg-dusk p-5 animate-in fade-in slide-in-from-bottom-6 duration-300",
              bottomOffset,
            )}
          >
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
