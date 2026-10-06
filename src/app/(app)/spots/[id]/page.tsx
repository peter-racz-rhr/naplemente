"use client";

import "@/lib/maplibre-worker";
import { ChevronLeft, Compass, Navigation, Share2, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Avatar } from "@/components/avatar";
import { MediaThumb } from "@/components/media-thumb";
import { ActionButton } from "@/components/onboarding/action-button";
import { BACK, PageTransition } from "@/components/page-transition";
import { SunsetDirection } from "@/components/sunset-direction";
import { SunsetForecast } from "@/components/sunset-forecast";
import { LiquidIconButton } from "@/components/ui/liquid-icon-button";
import { LiquidSurface } from "@/components/ui/liquid-surface";
import { Map, MapMarker, MarkerContent } from "@/components/ui/map";
import { useSpotDetail } from "@/lib/spot-detail";
import { removeSpot } from "@/lib/spots";
import {
  compassPoint,
  formatClock,
  formatCountdown,
  nextSunset,
  sunsetBearing,
} from "@/lib/sun";
import { useNow } from "@/lib/use-here";

export default function SpotPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const spot = useSpotDetail(id);
  const now = useNow();
  const [notice, setNotice] = useState<string | null>(null);
  // Your spots live on this device, so wait until we're in the browser
  // before deciding a spot doesn't exist.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const back = () => router.back();

  if (!hydrated) return <main className="min-h-dvh bg-night" />;

  if (!spot) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <h1 className="t-title">This spot is gone</h1>
        <p className="mt-3 text-haze">It may have been removed, or it was saved on another device.</p>
        <ActionButton className="mt-8" onClick={() => router.replace("/map")}>
          Back to the map
        </ActionButton>
      </main>
    );
  }

  const next = nextSunset(spot.latitude, spot.longitude, now);
  const bearing = next.kind === "sunset" ? sunsetBearing(spot.latitude, spot.longitude, next.at) : null;
  const hasHeroMedia = spot.media.length > 0 || Boolean(spot.photo);

  const share = async () => {
    const url = window.location.href;
    const text = `Sunset spot: ${spot.name}`;
    try {
      if (navigator.share) await navigator.share({ title: spot.name, text, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied");
        window.setTimeout(() => setNotice(null), 2000);
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;

  const miniMap = (
    <Map
      theme="dark"
      center={[spot.longitude, spot.latitude]}
      zoom={11.5}
      interactive={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <SunsetDirection latitude={spot.latitude} longitude={spot.longitude} lengthPx={110} id="spot-direction" />
      <MapMarker latitude={spot.latitude} longitude={spot.longitude}>
        <MarkerContent className="cursor-default">
          <span className="sun-mark block size-7 rounded-full ring-2 ring-night" />
        </MarkerContent>
      </MapMarker>
    </Map>
  );

  return (
    <PageTransition>
      <main className="mx-auto min-h-dvh w-full max-w-md pb-10">
        {/* Hero: photos and videos, or the map when there are none */}
        <div className="relative h-[52dvh] overflow-hidden bg-dusk">
          {spot.media.length > 0 ? (
            <div className="flex h-full snap-x snap-mandatory overflow-x-auto">
              {spot.media.map((m) => (
                <MediaThumb key={m.id} media={m} controls className="h-full w-full shrink-0 snap-center rounded-none" />
              ))}
            </div>
          ) : spot.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- Unsplash hotlink
            <img src={spot.photo.src} alt={spot.photo.alt} className="h-full w-full object-cover" />
          ) : (
            miniMap
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-night to-transparent" />

          <div className="absolute inset-x-0 top-0 flex justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
            <LiquidIconButton label="Back" shape="circle" onClick={back}>
              <ChevronLeft className="size-6" />
            </LiquidIconButton>
            <LiquidIconButton label="Share" shape="circle" onClick={share}>
              <Share2 className="size-5" />
            </LiquidIconButton>
          </div>
          {spot.media.length > 1 && (
            <p className="absolute right-4 bottom-4 rounded-full bg-night/70 px-2.5 py-1 text-[0.75rem]">
              Swipe for {spot.media.length - 1} more
            </p>
          )}
        </div>

        <div className="px-6">
          <h1 className="t-title mt-5">{spot.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-[0.9375rem] text-haze">
            {spot.by ? (
              <>
                <Avatar name={spot.by.name} colors={spot.by.colors} className="size-6 text-[0.625rem]" />
                Saved by {spot.by.name}
              </>
            ) : (
              "Your spot"
            )}
          </div>
          {spot.note && <p className="mt-4 text-[1.0625rem] leading-snug">{spot.note}</p>}

          {/* Tonight */}
          <LiquidSurface radius="1.5rem" className="mt-6 p-5">
            {next.kind === "sunset" ? (
              <>
                <p className="text-[0.875rem] text-haze">
                  Sunset {next.isToday ? "today" : "tomorrow"} at {formatClock(next.at)}
                </p>
                <p className="t-card-title mt-1">
                  In {formatCountdown(next.at.getTime() - now.getTime())}
                </p>
                {bearing !== null && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[0.9375rem] text-gold">
                    <Compass className="size-4" aria-hidden /> The sun goes down in the{" "}
                    {compassPoint(bearing)} ({Math.round(bearing)}°)
                  </p>
                )}
              </>
            ) : (
              <p className="t-card-title">No sunset here today</p>
            )}
          </LiquidSurface>

          {/* Map with the sunset direction, when the hero is a photo */}
          {hasHeroMedia && (
            <div className="mt-4 h-56 overflow-hidden rounded-[1.5rem] border border-dusk-edge">{miniMap}</div>
          )}

          <div className="mt-6 flex gap-3">
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-[1.0625rem] font-semibold text-night transition-transform active:scale-[0.97]"
            >
              <Navigation className="size-5" aria-hidden /> Directions
            </a>
            <button
              type="button"
              onClick={share}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-dusk-edge bg-dusk px-6 text-[1.0625rem] font-semibold transition-transform active:scale-[0.97]"
            >
              <Share2 className="size-5" aria-hidden /> Share
            </button>
          </div>
          {notice && (
            <p role="status" className="mt-3 text-center text-sm text-ok">
              {notice}
            </p>
          )}

          <section className="mt-10" aria-labelledby="forecast-heading">
            <h2 id="forecast-heading" className="t-section">
              Sunset forecast here
            </h2>
            <SunsetForecast latitude={spot.latitude} longitude={spot.longitude} />
          </section>

          {!spot.by && (
            <button
              type="button"
              onClick={() => {
                removeSpot(spot.id);
                router.replace("/map", { transitionTypes: BACK });
              }}
              className="mt-10 inline-flex h-12 items-center gap-2 text-error"
            >
              <Trash2 className="size-5" aria-hidden /> Remove spot
            </button>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
