/*
  Demo people for the Friends tab. Everything here is made up so the
  search and chat can be tried before real accounts exist.
*/
export type Person = {
  id: string;
  name: string;
  handle: string;
  /** Two colors for the avatar gradient */
  colors: [string, string];
  /** A spot they saved, shown on the map and in their profile */
  spot: { name: string; latitude: number; longitude: number };
  /** Canned replies, used in order when you message them */
  replies: string[];
  /** The message waiting in the chat when you first open it */
  opener?: string;
};

export const PEOPLE: Person[] = [
  {
    id: "reka",
    name: "Réka Szabó",
    handle: "reka.sunsets",
    colors: ["#ffb54d", "#f0648c"],
    spot: { name: "Tihany, abbey hill", latitude: 46.9139, longitude: 17.8892 },
    opener: "Tihany was unreal tonight. You have to come next time!",
    replies: [
      "Yes!! Friday? Sunset is around 18:20.",
      "Bring a jacket, it gets windy on the hill.",
      "I'll save the exact spot on the map for you.",
    ],
  },
  {
    id: "bence",
    name: "Bence Kovács",
    handle: "bencek",
    colors: ["#7fb6ff", "#9b7bff"],
    spot: { name: "Gellért Hill lookout", latitude: 47.4865, longitude: 19.0466 },
    opener: "Gellért Hill in 40 min, you in?",
    replies: [
      "Meet at the Liberty Statue.",
      "Clouds look good on the forecast, could be a great one.",
      "Running 5 min late, save me a spot!",
    ],
  },
  {
    id: "lili",
    name: "Lili Tóth",
    handle: "lilit",
    colors: ["#ff7a3d", "#ffd08a"],
    spot: { name: "Szigliget castle", latitude: 46.8027, longitude: 17.4338 },
    replies: [
      "Hiii! Where are you watching from tonight?",
      "Ooh nice, send a photo after.",
      "Next weekend Szigliget, the castle at sunset is magic.",
    ],
  },
  {
    id: "marco",
    name: "Marco Bianchi",
    handle: "marco.b",
    colors: ["#5ad1c4", "#3a7bd5"],
    spot: { name: "Piazzale Michelangelo", latitude: 43.7629, longitude: 11.265 },
    replies: [
      "Ciao! Florence is glowing right now.",
      "Piazzale Michelangelo, always.",
      "Come visit, I'll show you the best spots.",
    ],
  },
  {
    id: "anna",
    name: "Anna Nagy",
    handle: "annanagy",
    colors: ["#f0648c", "#9b7bff"],
    spot: { name: "Fishermen's Bastion", latitude: 47.5022, longitude: 19.0348 },
    replies: [
      "Hey! Thanks for the add.",
      "The Bastion is packed at sunset, go 30 min early.",
      "Have you tried the Normafa lookout?",
    ],
  },
  {
    id: "sam",
    name: "Sam Ortiz",
    handle: "samsets",
    colors: ["#ffd08a", "#5ad1c4"],
    spot: { name: "Belém riverside", latitude: 38.6916, longitude: -9.2159 },
    replies: [
      "Hey hey! Lisbon sunsets are the best, fight me.",
      "Belém by the river, around 19:00 this week.",
      "Do you have a favorite spot near you?",
    ],
  },
];

/** People you're friends with when you first open the app. */
export const STARTING_FRIENDS = ["reka", "bence", "lili"];

export const personById = (id: string) => PEOPLE.find((p) => p.id === id);
