"use client";

import { LocateFixed, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar } from "@/components/avatar";
import { Field } from "@/components/onboarding/field";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  type MapRef,
} from "@/components/ui/map";
import { PEOPLE } from "@/lib/demo-people";
import { removeSpot, saveSpot, useSpots } from "@/lib/spots";
import { useFriendIds } from "@/lib/social";
import { formatClock, nextSunset } from "@/lib/sun";
import { useHere } from "@/lib/use-here";
import { cn } from "@/lib/utils";

// Budapest, until we know where you are.
const FALLBACK_CENTER: [number, number] = [19.04, 47.5];

function SunsetLine({ latitude, longitude }: { latitude: number; longitude: number }) {
  const next = nextSunset(latitude, longitude);
  if (next.kind === "none") return <>No sunset here today</>;
  return (
    <>
      Sunset {next.isToday ? "today" : "tomorrow"} at {formatClock(next.at)}
    </>
  );
}

export default function MapPage() {
  const mapRef = useRef<MapRef>(null);
  const here = useHere();
  const spots = useSpots();
  const friendIds = useFriendIds();
  const friends = PEOPLE.filter((p) => friendIds.includes(p.id));

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  const startSaving = () => {
    setSaving(true);
    setName("");
    setNote("");
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const map = mapRef.current;
    if (!map) return;
    if (!name.trim()) {
      setError("Give the spot a name.");
      return;
    }
    const center = map.getCenter();
    const spot = saveSpot({
      name: name.trim(),
      note: note.trim(),
      latitude: center.lat,
      longitude: center.lng,
    });
    setSaving(false);
    setJustSaved(spot.name);
    window.setTimeout(() => setJustSaved(null), 2600);
  };

  return (
    <main className="fixed inset-0 bg-night">
      <Map
        ref={mapRef}
        theme="dark"
        center={
          here.coords
            ? [here.coords.longitude, here.coords.latitude]
            : FALLBACK_CENTER
        }
        zoom={here.coords ? 12 : 5}
        className="h-full w-full"
      >
        {friends.map((person) => (
          <MapMarker
            key={person.id}
            latitude={person.spot.latitude}
            longitude={person.spot.longitude}
          >
            <MarkerContent>
              <Avatar
                name={person.name}
                colors={person.colors}
                className="size-8 text-[0.6875rem] ring-2 ring-night"
              />
            </MarkerContent>
            <MarkerPopup className="w-60 rounded-2xl border-dusk-edge p-4">
              <p className="font-semibold">{person.spot.name}</p>
              <p className="mt-0.5 text-sm text-haze">
                Saved by {person.name.split(" ")[0]}
              </p>
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
            <MarkerPopup className="w-60 rounded-2xl border-dusk-edge p-4">
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
      </Map>

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="glass pointer-events-auto rounded-full px-4 py-2.5 text-[0.9375rem]">
          {saving
            ? "Move the map to put the pin on your spot"
            : spots.length === 0
              ? "Save the places you watch the sunset"
              : `${spots.length} saved ${spots.length === 1 ? "spot" : "spots"}`}
        </div>
        <button
          type="button"
          onClick={locate}
          aria-label="Show where I am"
          className="glass pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full text-ink active:scale-95"
        >
          <LocateFixed className={cn("size-5", here.status === "locating" && "animate-pulse")} />
        </button>
      </div>

      {/* Pin in the middle while choosing where to save */}
      {saving && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center"
        >
          <span className="sun-mark block size-9 rounded-full ring-4 ring-night" />
          <span className="h-5 w-0.5 bg-ink" />
        </div>
      )}

      {justSaved && (
        <p
          role="status"
          className="glass absolute inset-x-6 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+6.5rem)] rounded-2xl px-4 py-3 text-center animate-in fade-in slide-in-from-bottom-2"
        >
          Saved {justSaved}
        </p>
      )}

      {/* Save a spot */}
      {!saving ? (
        !justSaved && (
          <button
            type="button"
            onClick={startSaving}
            className="glass absolute bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+6.5rem)] left-1/2 inline-flex h-14 -translate-x-1/2 items-center gap-2 rounded-full px-6 text-[1.0625rem] font-semibold text-ink transition-transform active:scale-[0.97]"
          >
            <Plus className="size-5" aria-hidden /> Save a spot
          </button>
        )
      ) : (
        <form
          noValidate
          onSubmit={submit}
          className="absolute inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+6rem)] z-10 rounded-[1.75rem] border border-dusk-edge bg-dusk p-5 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[1.25rem] font-semibold tracking-[-0.02em]">Save this spot</h2>
            <button
              type="button"
              onClick={() => setSaving(false)}
              aria-label="Cancel"
              className="-mr-2 grid size-10 place-items-center rounded-full text-haze hover:text-ink"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Field
              label="Name"
              hideLabel
              placeholder="Name, like Hilltop bench"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={error}
              className="[&_input]:bg-night"
              autoFocus
            />
            <Field
              label="Note"
              hideLabel
              placeholder="Note (optional): how to get there"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="[&_input]:bg-night"
            />
            <button
              type="submit"
              className="h-14 rounded-full bg-ink text-[1.0625rem] font-semibold text-night transition-transform active:scale-[0.97]"
            >
              Save spot
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
