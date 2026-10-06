"use client";

import { personById, type Person } from "./demo-people";
import { postById } from "./demo-posts";
import type { MediaRef } from "./media-store";
import { useSpots } from "./spots";

export type SpotDetail = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  note: string;
  /** Who saved it; null means you did. */
  by: Person | null;
  /** Your photos and videos, or a friend's photo URL. */
  media: MediaRef[];
  photo?: { src: string; alt: string };
};

/** Spot pages are `/spots/<your spot id>` or `/spots/post-<post id>`. */
export const spotHref = (id: string) => `/spots/${id}`;
export const postSpotHref = (postId: string) => `/spots/post-${postId}`;

export function useSpotDetail(id: string): SpotDetail | null {
  const spots = useSpots();

  if (id.startsWith("post-")) {
    const post = postById(id.slice(5));
    if (!post) return null;
    return {
      id,
      ...post.spot,
      note: post.caption,
      by: personById(post.personId) ?? null,
      media: [],
      photo: { src: post.photo, alt: post.alt },
    };
  }

  const spot = spots.find((s) => s.id === id);
  if (!spot) return null;
  return {
    id,
    name: spot.name,
    latitude: spot.latitude,
    longitude: spot.longitude,
    note: spot.note,
    by: null,
    media: spot.media ?? [],
  };
}
