"use client";

import { LogOut, MapPin, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { MediaThumb } from "@/components/media-thumb";
import { BACK, FORWARD, PageTransition } from "@/components/page-transition";
import { getSupabase } from "@/lib/supabase/client";
import { replayIntro, resetOnboarding } from "@/lib/onboarding";
import { useDisplayName } from "@/lib/profile";
import { useFriendIds } from "@/lib/social";
import { spotHref } from "@/lib/spot-detail";
import { useSpots } from "@/lib/spots";

const savedOn = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

export default function ProfilePage() {
  const router = useRouter();
  const name = useDisplayName() || "You";
  const spots = useSpots();
  const friendIds = useFriendIds();

  // For trying the app from the very start: your spots and chats stay.
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
        <div className="flex flex-col items-center pt-8 text-center">
          <Avatar name={name} colors={["#ffb54d", "#f0648c"]} className="size-24 text-[1.75rem]" />
          <h1 className="mt-4 t-title">
            {name}
          </h1>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-2">
          <div className="rounded-[1.5rem] bg-dusk p-4 text-center">
            <dd className="t-card-title tabular-nums">{spots.length}</dd>
            <dt className="text-sm text-haze">Saved spots</dt>
          </div>
          <div className="rounded-[1.5rem] bg-dusk p-4 text-center">
            <dd className="t-card-title tabular-nums">{friendIds.length}</dd>
            <dt className="text-sm text-haze">Friends</dt>
          </div>
        </dl>

        <section className="mt-8" aria-labelledby="spots-heading">
          <h2 id="spots-heading" className="t-section">
            Your spots
          </h2>
          {spots.length === 0 ? (
            <p className="mt-2 text-haze">
              Nothing saved yet. On the Map tab, tap Save a spot.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-dusk-edge">
              {spots.map((spot) => (
                <li key={spot.id}>
                  <Link
                    href={spotHref(spot.id)}
                    transitionTypes={FORWARD}
                    className="-mx-3 flex items-center gap-3 rounded-2xl px-3 py-3.5 hover:bg-dusk active:bg-dusk"
                  >
                  {spot.media?.[0] ? (
                    <MediaThumb media={spot.media[0]} className="size-12 shrink-0 rounded-xl" />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-dusk">
                      <MapPin className="size-5 text-gold" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{spot.name}</span>
                    {spot.note && (
                      <span className="block truncate text-sm text-haze">{spot.note}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-haze">
                    {savedOn.format(new Date(spot.savedAt))}
                  </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10" aria-labelledby="settings-heading">
          <h2 id="settings-heading" className="t-section">
            Settings
          </h2>
          <ul className="mt-2 divide-y divide-dusk-edge overflow-hidden rounded-[1.5rem] bg-dusk">
            <li>
              <button
                type="button"
                onClick={showIntro}
                className="flex w-full items-center gap-3 px-4 py-4 text-left active:bg-dusk-edge/50"
              >
                <RotateCcw className="size-5 shrink-0 text-gold" aria-hidden />
                <span className="flex-1">
                  <span className="block">Show the intro again</span>
                  <span className="block text-sm text-haze">
                    Replays the welcome, sign-up and reminders. Your spots stay.
                  </span>
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={logOut}
                className="flex w-full items-center gap-3 px-4 py-4 text-left text-error active:bg-dusk-edge/50"
              >
                <LogOut className="size-5 shrink-0" aria-hidden /> Log out
              </button>
            </li>
          </ul>
        </section>

        <footer className="mt-10 border-t border-dusk-edge pt-5 pb-6 text-[0.8125rem] leading-relaxed text-haze">
          Made with components from Aceternity UI, Skiper UI and mapcn. Map ©
          CARTO, © OpenStreetMap contributors. Weather by Open-Meteo. Photos
          from Unsplash.
        </footer>
      </main>
    </PageTransition>
  );
}
