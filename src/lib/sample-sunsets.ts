/*
  Placeholder sunsets until people upload their own.
  Photos are hotlinked from Unsplash (free to use under the Unsplash
  License, https://unsplash.com/license). Captions describe what's in each
  photo; they are not real saved spots.
*/
export type SampleSunset = {
  title: string;
  note: string;
  photo: string;
  alt: string;
};

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=720&h=1000&fit=crop&q=75&auto=format`;

export const SAMPLE_SUNSETS: SampleSunset[] = [
  {
    title: "Pier on a still lake",
    note: "The sun drops into the mist",
    photo: unsplash("1495616811223-4d98c6e9c869"),
    alt: "A wooden pier stretching into a calm lake under an orange sunset",
  },
  {
    title: "Last light on the sea",
    note: "Clouds catching fire",
    photo: unsplash("1503803548695-c2a7b4a5b875"),
    alt: "The sun setting over the sea beneath orange and pink clouds",
  },
  {
    title: "Layers of hills",
    note: "Pink haze after sunset",
    photo: unsplash("1500964757637-c85e8a162699"),
    alt: "Rows of mountain ridges fading into a pink and orange sky",
  },
  {
    title: "Wheat field",
    note: "Golden hour, end of summer",
    photo: unsplash("1500382017468-9049fed747ef"),
    alt: "The low sun shining across a golden wheat field",
  },
  {
    title: "Sun on the water",
    note: "Warm sand, cooling air",
    photo: unsplash("1414609245224-afa02bfb3fda"),
    alt: "The sun touching the horizon over the sea, reflected on wet sand",
  },
  {
    title: "Above the clouds",
    note: "Peaks in the afterglow",
    photo: unsplash("1506905925346-21bda4d32df4"),
    alt: "Snowy mountain peaks above a sea of clouds at dusk",
  },
  {
    title: "Mountain valley",
    note: "The sun slipping behind the ridge",
    photo: unsplash("1490682143684-14369e18dce8"),
    alt: "Sunlight pouring over a forested mountain ridge",
  },
  {
    title: "Purple shore",
    note: "Blue hour by the water",
    photo: unsplash("1475924156734-496f6cac6ec1"),
    alt: "Waves on a rocky shore under a purple evening sky",
  },
  {
    title: "Lavender lake",
    note: "The mountains turn violet",
    photo: unsplash("1532274402911-5a369e4c4bb5"),
    alt: "Purple flowers by a lake with mountains under a violet evening sky",
  },
];
