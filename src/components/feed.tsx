"use client";

import { Heart, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { MediaThumb } from "@/components/media-thumb";
import { FORWARD } from "@/components/page-transition";
import { personById, type Person } from "@/lib/demo-people";
import { POSTS } from "@/lib/demo-posts";
import type { MediaRef } from "@/lib/media-store";
import { useDisplayName } from "@/lib/profile";
import { toggleLike, useFriendIds, useLikedPosts } from "@/lib/social";
import { postSpotHref, spotHref } from "@/lib/spot-detail";
import { useSpots } from "@/lib/spots";
import { minutesSince, timeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

type FeedItem = {
  key: string;
  author: { name: string; colors: [string, string] };
  spotName: string;
  href: string;
  minutesAgo: number;
  caption: string;
  photo?: { src: string; alt: string };
  media?: MediaRef;
  likes: number;
  likeId: string;
  comments: { person: Person | undefined; text: string }[];
};

/** Friends' sunsets plus your own spots that have a photo or video. */
export function Feed() {
  const friendIds = useFriendIds();
  const liked = useLikedPosts();
  const spots = useSpots();
  const myName = useDisplayName() || "You";

  const items: FeedItem[] = [
    ...spots
      .filter((s) => s.media && s.media.length > 0)
      .map((s) => ({
        key: s.id,
        author: { name: myName, colors: ["#ffb54d", "#f0648c"] as [string, string] },
        spotName: s.name,
        href: spotHref(s.id),
        minutesAgo: minutesSince(s.savedAt),
        caption: s.note,
        media: s.media![0],
        likes: 0,
        likeId: s.id,
        comments: [],
      })),
    ...POSTS.filter((p) => friendIds.includes(p.personId)).map((p) => {
      const person = personById(p.personId)!;
      return {
        key: p.id,
        author: { name: person.name, colors: person.colors },
        spotName: p.spot.name,
        href: postSpotHref(p.id),
        minutesAgo: p.minutesAgo,
        caption: p.caption,
        photo: { src: p.photo, alt: p.alt },
        likes: p.likes,
        likeId: p.id,
        comments: p.comments.map((c) => ({ person: personById(c.personId), text: c.text })),
      };
    }),
  ].sort((a, b) => a.minutesAgo - b.minutesAgo);

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-haze">
        Nothing here yet. Add friends to see their sunsets, or save a spot with a photo.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-8">
      {items.map((item) => (
        <FeedPost key={item.key} item={item} isLiked={liked.includes(item.likeId)} />
      ))}
    </ol>
  );
}

function FeedPost({ item, isLiked }: { item: FeedItem; isLiked: boolean }) {
  const [showComments, setShowComments] = useState(false);
  const firstName = item.author.name.split(" ")[0];

  return (
    <li>
      <div className="flex items-center gap-3">
        <Avatar name={item.author.name} colors={item.author.colors} className="size-10 text-sm" />
        <p className="min-w-0 flex-1 text-[0.9375rem] leading-tight">
          <span className="font-semibold">{firstName}</span>
          <span className="text-haze"> at </span>
          <span className="font-semibold">{item.spotName}</span>
          <span className="block text-[0.8125rem] text-haze">{timeAgo(item.minutesAgo)} ago</span>
        </p>
      </div>

      <Link href={item.href} transitionTypes={FORWARD} className="mt-3 block">
        {item.media ? (
          <MediaThumb media={item.media} className="aspect-[4/5] w-full rounded-[1.5rem]" />
        ) : (
          item.photo && (
            // eslint-disable-next-line @next/next/no-img-element -- Unsplash hotlink
            <img
              src={item.photo.src}
              alt={item.photo.alt}
              loading="lazy"
              className="aspect-[4/5] w-full rounded-[1.5rem] object-cover"
            />
          )
        )}
      </Link>

      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => toggleLike(item.likeId)}
          aria-pressed={isLiked}
          aria-label={isLiked ? "Unlike" : "Like"}
          className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 active:scale-90"
        >
          <Heart
            className={cn(
              "size-6 transition-colors",
              isLiked ? "fill-rose text-rose" : "text-ink",
            )}
          />
          <span className="text-[0.9375rem] tabular-nums">{item.likes + (isLiked ? 1 : 0)}</span>
        </button>
        {item.comments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            aria-expanded={showComments}
            aria-label={`${item.comments.length} comments`}
            className="inline-flex h-11 items-center gap-1.5 rounded-full px-2"
          >
            <MessageCircle className="size-6" aria-hidden />
            <span className="text-[0.9375rem] tabular-nums">{item.comments.length}</span>
          </button>
        )}
        <Link
          href={item.href}
          transitionTypes={FORWARD}
          className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-[0.9375rem] text-haze hover:text-ink"
        >
          <MapPin className="size-5" aria-hidden /> Open spot
        </Link>
      </div>

      {item.caption && (
        <p className="text-[1rem] leading-snug">
          <span className="font-semibold">{firstName}</span> {item.caption}
        </p>
      )}

      {showComments && (
        <ul className="mt-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1">
          {item.comments.map((c, i) => (
            <li key={i} className="text-[0.9375rem] leading-snug">
              <span className="font-semibold">{c.person?.name.split(" ")[0]}</span>{" "}
              <span className="text-ink/85">{c.text}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
