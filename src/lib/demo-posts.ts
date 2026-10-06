/*
  Demo feed: sunsets the made-up friends "posted". Photos are the Unsplash
  placeholders; captions and comments are invented for the demo.
*/
import { SAMPLE_SUNSETS } from "./sample-sunsets";

export type Post = {
  id: string;
  personId: string;
  spot: { name: string; latitude: number; longitude: number };
  photo: string;
  alt: string;
  caption: string;
  minutesAgo: number;
  likes: number;
  comments: { personId: string; text: string }[];
};

const photo = (i: number) => ({
  photo: SAMPLE_SUNSETS[i].photo,
  alt: SAMPLE_SUNSETS[i].alt,
});

export const POSTS: Post[] = [
  {
    id: "reka-tihany",
    personId: "reka",
    spot: { name: "Tihany, abbey hill", latitude: 46.9139, longitude: 17.8892 },
    ...photo(0),
    caption: "The lake went completely still for ten minutes. Worth the climb.",
    minutesAgo: 47,
    likes: 24,
    comments: [
      { personId: "bence", text: "Unreal. Saving this spot." },
      { personId: "lili", text: "Next time take me!!" },
    ],
  },
  {
    id: "bence-gellert",
    personId: "bence",
    spot: { name: "Gellért Hill lookout", latitude: 47.4865, longitude: 19.0466 },
    ...photo(2),
    caption: "Haze over the Buda hills, the whole sky went pink after.",
    minutesAgo: 60 * 5,
    likes: 41,
    comments: [{ personId: "reka", text: "Those layers 😍" }],
  },
  {
    id: "lili-szigliget",
    personId: "lili",
    spot: { name: "Szigliget castle", latitude: 46.8027, longitude: 17.4338 },
    ...photo(6),
    caption: "Castle hill at golden hour. Bring water, it's steep.",
    minutesAgo: 60 * 26,
    likes: 18,
    comments: [],
  },
  {
    id: "marco-michelangelo",
    personId: "marco",
    spot: { name: "Piazzale Michelangelo", latitude: 43.7629, longitude: 11.265 },
    ...photo(1),
    caption: "Florence never disappoints.",
    minutesAgo: 60 * 30,
    likes: 63,
    comments: [{ personId: "anna", text: "Adding Florence to the list." }],
  },
  {
    id: "anna-bastion",
    personId: "anna",
    spot: { name: "Fishermen's Bastion", latitude: 47.5022, longitude: 19.0348 },
    ...photo(3),
    caption: "Got there 30 min early and still barely found a spot.",
    minutesAgo: 60 * 50,
    likes: 29,
    comments: [],
  },
  {
    id: "sam-belem",
    personId: "sam",
    spot: { name: "Belém riverside", latitude: 38.6916, longitude: -9.2159 },
    ...photo(4),
    caption: "Lisbon gold. Fight me.",
    minutesAgo: 60 * 72,
    likes: 52,
    comments: [{ personId: "marco", text: "Florence > Lisbon, sorry." }],
  },
];

export const postById = (id: string) => POSTS.find((p) => p.id === id);
export const postForPerson = (personId: string) =>
  POSTS.find((p) => p.personId === personId);
