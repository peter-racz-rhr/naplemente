# Naplemente

Save the places where you watch the sun go down, and share the best ones.
A mobile-first web app (installable to the Home Screen as a PWA), built with
Next.js, Tailwind, shadcn/ui and Supabase.

## What's built so far: onboarding

| Route | Screen |
| --- | --- |
| `/` | Splash: the wordmark, while the globe loads in the background |
| `/welcome` | The planet rises, two short lines point at its sunset line, then the welcome panel with terms, **Create an account** and **Log in** |
| `/signup` | Continue with Apple, Google or email |
| `/signup/email` | Name, email, password with inline validation |
| `/login` | Apple, Google, or email and password |
| `/permissions/location` | Why we ask, then the real sunset time where you are |
| `/permissions/notifications` | Sunset reminders (with Home Screen hint on iPhone) |
| `/map` | Main tab. Dark map with your spots and friends' spots, and a glowing line pointing to where the sun sets tonight from where you are; tap anywhere to save a spot there, with photos and videos |
| `/sunset` | Countdown, golden and blue hour, tonight's sunset rating and a 5-day forecast (Open-Meteo), friends' sunset photos |
| `/friends`, `/friends/[id]` | Feed of friends' sunsets (likes, comments) and Chats: search people, add friends, demo chat with typed replies |
| `/spots/[id]` | Spot page: photos, sunset countdown and direction, mini map, forecast for that spot, Directions and Share |
| `/profile` | Name, stats, saved spots, log out, credits |

Spots, friends and messages are stored on the device (localStorage, and
IndexedDB for photos and videos) until
Supabase tables replace them. The people and replies in the Friends tab are
made up for the demo (`src/lib/demo-people.ts`).

The globe is Aceternity's `3d-globe` (`src/components/ui/3d-globe.tsx`),
extended with a day/night shader: the sun is fixed relative to the camera,
so the glowing line where the sun is setting always stays in view while the
Earth turns. Textures are served locally from `public/textures`.

## Credits

- 3D globe and floating dock: [Aceternity UI](https://ui.aceternity.com)
- Card swipe carousel: [Skiper UI](https://skiper-ui.com) (free tier, attribution required)
- Map: [mapcn](https://mapcn.dev) on MapLibre, tiles © CARTO, © OpenStreetMap contributors
- Liquid glass: [Liquefy UI](https://liquefy-ui.com)
- Weather: [Open-Meteo](https://open-meteo.com)
- Photos: [Unsplash](https://unsplash.com)
- Earth textures: NASA Blue Marble and Black Marble, via three-globe

## Run it

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 in a phone-sized window.

## Supabase (real sign-up)

Without keys the app runs in **demo mode**: every sign-in option succeeds
locally so the flow can be clicked through.

1. Create a project at https://supabase.com.
2. Copy `.env.example` to `.env.local` and fill in the URL and anon key from
   Project Settings → API.
3. In Authentication → URL Configuration, add
   `http://localhost:3000/auth/callback` (and your production URL) to the
   redirect URLs.
4. Google: Authentication → Providers → Google, with an OAuth client from
   Google Cloud.
5. Apple: Authentication → Providers → Apple (needs an Apple Developer
   account).

## Design notes

- True black background; warm color appears only on the globe's sunset line
  and the few moments that point at it.
- One typeface: Instrument Sans (bundled via Fontsource). Headings use its
  narrower widths (`t-display`, `t-title`, `t-card-title`, `t-section` in
  globals.css); body text stays at normal width.
- Sentence case everywhere, no uppercase labels.
- Motion is one orchestrated intro; `prefers-reduced-motion` turns it off.
