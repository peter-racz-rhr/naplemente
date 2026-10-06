"use client";

import { LogOut, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { BACK, PageTransition } from "@/components/page-transition";
import { getSupabase } from "@/lib/supabase/client";
import { resetOnboarding } from "@/lib/onboarding";
import { useDisplayName } from "@/lib/profile";
import { useFriendIds } from "@/lib/social";
import { useSpots } from "@/lib/spots";

const savedOn = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

export default function ProfilePage() {
  const router = useRouter();
  const name = useDisplayName() || "You";
  const spots = useSpots();
  const friendIds = useFriendIds();

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
          <h1 className="mt-4 text-[2rem] leading-tight font-semibold tracking-[-0.03em]">
            {name}
          </h1>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-2">
          <div className="rounded-[1.5rem] bg-dusk p-4 text-center">
            <dd className="text-[1.75rem] font-semibold tracking-[-0.03em]">{spots.length}</dd>
            <dt className="text-sm text-haze">Saved spots</dt>
          </div>
          <div className="rounded-[1.5rem] bg-dusk p-4 text-center">
            <dd className="text-[1.75rem] font-semibold tracking-[-0.03em]">{friendIds.length}</dd>
            <dt className="text-sm text-haze">Friends</dt>
          </div>
        </dl>

        <section className="mt-8" aria-labelledby="spots-heading">
          <h2 id="spots-heading" className="text-[1.25rem] font-semibold tracking-[-0.02em]">
            Your spots
          </h2>
          {spots.length === 0 ? (
            <p className="mt-2 text-haze">
              Nothing saved yet. On the Map tab, tap Save a spot.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-dusk-edge">
              {spots.map((spot) => (
                <li key={spot.id} className="flex items-center gap-3 py-3.5">
                  <MapPin className="size-5 shrink-0 text-gold" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{spot.name}</span>
                    {spot.note && (
                      <span className="block truncate text-sm text-haze">{spot.note}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-haze">
                    {savedOn.format(new Date(spot.savedAt))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          onClick={logOut}
          className="mt-10 inline-flex h-12 items-center gap-2 text-error"
        >
          <LogOut className="size-5" aria-hidden /> Log out
        </button>

        <footer className="mt-10 border-t border-dusk-edge pt-5 pb-6 text-[0.8125rem] leading-relaxed text-haze">
          Made with components from Aceternity UI, Skiper UI and mapcn. Map ©
          CARTO, © OpenStreetMap contributors. Weather by Open-Meteo. Photos
          from Unsplash.
        </footer>
      </main>
    </PageTransition>
  );
}
