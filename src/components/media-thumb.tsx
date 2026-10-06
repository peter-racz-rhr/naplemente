"use client";

import { Play } from "lucide-react";
import { useMediaUrl, type MediaRef } from "@/lib/media-store";
import { cn } from "@/lib/utils";

/** A stored photo or video. Videos get controls when `controls` is set. */
export function MediaThumb({
  media,
  className,
  controls = false,
}: {
  media: MediaRef;
  className?: string;
  controls?: boolean;
}) {
  const url = useMediaUrl(media.id);
  const box = cn("relative overflow-hidden rounded-2xl bg-night", className);
  if (!url) return <div className={box} />;

  return (
    <div className={box}>
      {media.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          <video
            src={url}
            controls={controls}
            muted={!controls}
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
          {!controls && (
            <Play
              aria-hidden
              className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow"
            />
          )}
        </>
      )}
    </div>
  );
}
