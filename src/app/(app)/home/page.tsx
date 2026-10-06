"use client";

import { Carousel_002 } from "@/components/ui/skiper-ui/skiper48";
import { PageTransition } from "@/components/page-transition";
import { Wordmark } from "@/components/wordmark";
import { SAMPLE_SUNSETS } from "@/lib/sample-sunsets";
import { useSunsetHere } from "@/lib/use-sunset-here";

export default function HomePage() {
  const sunset = useSunsetHere();

  const slides = SAMPLE_SUNSETS.map((s) => ({
    src: s.photo,
    alt: s.alt,
    caption: (
      <>
        <p className="text-[1.25rem] leading-tight font-semibold tracking-[-0.02em] text-white">
          {s.spot}
        </p>
        <p className="mt-0.5 text-sm text-white/75">{s.place}</p>
        <p className="mt-3 text-[0.6875rem] text-white/55">
          Photo: {s.photographer} / Unsplash
        </p>
      </>
    ),
  }));

  return (
    <PageTransition>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-x-hidden px-6 pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="flex h-12 items-center">
          <Wordmark className="text-[1.375rem]" />
        </div>

        <section className="mt-6">
          <h1 className="text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.035em]">
            {sunset?.headline ?? "Tonight"}
          </h1>
          <p className="mt-2 text-[1.0625rem] leading-snug text-haze">
            {sunset?.detail ??
              "Turn on location to see how long until sunset where you are."}
          </p>
        </section>

        <section className="mt-10" aria-labelledby="saved-heading">
          <h2
            id="saved-heading"
            className="text-[1.25rem] font-semibold tracking-[-0.02em]"
          >
            Sunsets people saved
          </h2>
          <p className="mt-1 text-[0.9375rem] text-haze">
            Swipe through the cards.
          </p>
          {slides.length > 0 ? (
            <div className="mt-6 -mx-6 flex justify-center">
              <Carousel_002
                images={slides}
                loop
                spaceBetween={24}
                cardClassName="h-[min(62dvh,460px)] w-[min(74vw,320px)]"
              />
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-dusk px-4 py-6 text-center text-haze">
              Sunset photos are on their way.
            </p>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
