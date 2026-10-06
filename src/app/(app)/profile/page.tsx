"use client";

import { ChevronRight, LogOut, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MediaThumb } from "@/components/media-thumb";
import { BACK, FORWARD, PageTransition } from "@/components/page-transition";
import { SOCIAL_ENABLED } from "@/lib/features";
import { replayIntro, resetOnboarding } from "@/lib/onboarding";
import { setDisplayName, useDisplayName } from "@/lib/profile";
import { useFriendIds } from "@/lib/social";
import { spotHref } from "@/lib/spot-detail";
import { useSpots, type Spot } from "@/lib/spots";
import { getSupabase } from "@/lib/supabase/client";
import { formatClock, nextSunset } from "@/lib/sun";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A spot without a photo gets a little dusk sky with its sunset time. */
function SkyTile({ spot }: { spot: Spot }) {
  const next = nextSunset(spot.latitude, spot.longitude);
  return (
    <div className="relative h-full w-full bg-[linear-gradient(to_bottom,#141a3c,#57345f_55%,#dc6648_80%,#000_80.5%)]">
      <span className="sun-mark absolute bottom-[19.5%] left-1/2 block h-3 w-6 -translate-x-1/2 rounded-t-full" />
      {next.kind === "sunset" && (
        <span className="absolute right-3 bottom-2 text-[0.75rem] text-gold tabular-nums">
          {formatClock(next.at)}
        </span>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const storedName = useDisplayName();
  const spots = useSpots();
  const friendIds = useFriendIds();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");

  const media = spots.reduce((n, s) => n + (s.media?.length ?? 0), 0);
  const summary = [
    plural(spots.length, "spot", "spots"),
    ...(media > 0 ? [plural(media, "photo or video", "photos and videos")] : []),
    ...(SOCIAL_ENABLED ? [plural(friendIds.length, "friend", "friends")] : []),
  ].join(" · ");

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    setDisplayName(draftName.trim());
    setEditing(false);
  };

  // For trying the app from the very start: your spots stay.
  const showIntro = () => {
    replayIntro();
    router.replace("/", { transitionTypes: BACK });
  };

  const logOut = async () => {
    await getSupabase()?.auth.signOut();
    resetOnboarding();
    router.replace("/welcome", { transitionTypes: BACK });
  };

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-md px-6 pt-[max(env(safe-area-inset-top),1rem)]">
        {/* Name and a one-line summary */}
        <header className="pt-8">
          {editing ? (
            <form onSubmit={saveName} className="flex items-center gap-2">
              <label htmlFor="name" className="sr-only">
                Your name
              </label>
              <input
                id="name"
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={saveName}
                placeholder="Your name"
                autoComplete="given-name"
                className="t-display min-w-0 flex-1 border-b border-dusk-edge bg-transparent pb-1 text-ink outline-none placeholder:text-haze/50 focus:border-gold"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraftName(storedName);
                setEditing(true);
              }}
              className="group flex items-baseline gap-3 text-left"
            >
              <h1 className={storedName ? "t-display" : "t-display text-haze"}>
                {storedName || "Add your name"}
              </h1>
              <Pencil className="size-4 shrink-0 text-haze opacity-60 group-hover:opacity-100" aria-label="Edit name" />
            </button>
          )}
          <p className="mt-3 text-[1.0625rem] text-haze">{summary}</p>
        </header>

        {/* Spots as a grid of photos (or a little sky when there's none) */}
        <section className="mt-10" aria-labelledby="spots-heading">
          <h2 id="spots-heading" className="t-section">
            Your spots
          </h2>
          {spots.length === 0 ? (
            <p className="mt-2 max-w-[32ch] text-haze">
              Nothing saved yet. Tap anywhere on the map to save the place you&apos;re watching from.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {spots.map((spot) => (
                <li key={spot.id}>
                  <Link
                    href={spotHref(spot.id)}
                    transitionTypes={FORWARD}
                    className="relative block aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-dusk active:scale-[0.98] transition-transform"
                  >
                    {spot.media?.[0] ? (
                      <MediaThumb media={spot.media[0]} className="h-full w-full rounded-none" />
                    ) : (
                      <SkyTile spot={spot} />
                    )}
                    <span className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-3 pt-3 pb-8 text-[0.9375rem] leading-tight font-semibold">
                      {spot.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Settings */}
        <section className="mt-12" aria-labelledby="settings-heading">
          <h2 id="settings-heading" className="t-section">
            Settings
          </h2>
          <ul className="mt-2 divide-y divide-dusk-edge border-y border-dusk-edge">
            <li>
              <button type="button" onClick={showIntro} className="flex w-full items-center gap-4 py-4 text-left">
                <RotateCcw className="size-5 shrink-0 text-haze" aria-hidden />
                <span className="flex-1">
                  <span className="block">Show the intro again</span>
                  <span className="block text-sm text-haze">Welcome, sign-up and reminders. Your spots stay.</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-haze" aria-hidden />
              </button>
            </li>
            <li>
              <button type="button" onClick={logOut} className="flex w-full items-center gap-4 py-4 text-left text-error">
                <LogOut className="size-5 shrink-0" aria-hidden />
                <span className="flex-1">Log out</span>
              </button>
            </li>
          </ul>
        </section>

        <footer className="mt-10 pb-6 text-[0.8125rem] leading-relaxed text-haze">
          Made with components from Aceternity UI, Skiper UI, Liquefy UI and mapcn. Map © CARTO, ©
          OpenStreetMap contributors. Weather by Open-Meteo. Photos from Unsplash.
        </footer>
      </main>
    </PageTransition>
  );
}
