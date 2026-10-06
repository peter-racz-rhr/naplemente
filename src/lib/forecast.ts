/*
  Sunset forecast from Open-Meteo (free, no key): https://open-meteo.com
  We look at the clouds in the hour of sunset. High and mid clouds catch
  the color; low clouds and rain block the sun.
*/

export type SunsetQuality = "great" | "good" | "okay" | "poor";

export type SunsetDay = {
  /** Local date at the location, "2026-10-06" */
  date: string;
  /** Local sunset time at the location, "18:31" */
  sunset: string;
  quality: SunsetQuality;
  reason: string;
  temperature: number;
  clouds: { low: number; mid: number; high: number };
  rainChance: number;
};

type OpenMeteoResponse = {
  hourly: {
    time: string[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    precipitation_probability: number[];
    temperature_2m: number[];
  };
  daily: { time: string[]; sunset: string[] };
};

export function rateSunset(c: {
  low: number;
  mid: number;
  high: number;
  rain: number;
}): { quality: SunsetQuality; reason: string } {
  const upper = Math.max(c.mid, c.high);
  if (c.rain >= 60) return { quality: "poor", reason: "Rain is likely" };
  if (c.low >= 70)
    return { quality: "poor", reason: "Thick low clouds will hide the sun" };
  if (upper >= 25 && upper <= 80 && c.low < 40)
    return { quality: "great", reason: "High clouds to catch the color" };
  if (upper + c.low < 20)
    return { quality: "good", reason: "Clear sky, a clean sunset" };
  if (c.low < 60) return { quality: "okay", reason: "Some clouds in the way" };
  return { quality: "poor", reason: "Mostly cloudy at the horizon" };
}

export async function fetchSunsetForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<SunsetDay[]> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(3),
    longitude: longitude.toFixed(3),
    hourly:
      "cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation_probability,temperature_2m",
    daily: "sunset",
    timezone: "auto",
    forecast_days: "6",
  });
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error(`Forecast failed (${response.status})`);
  const data = (await response.json()) as OpenMeteoResponse;

  return data.daily.time.flatMap((date, i) => {
    const sunsetAt = data.daily.sunset[i]; // "2026-10-06T18:31"
    if (!sunsetAt) return [];
    const hourKey = `${sunsetAt.slice(0, 13)}:00`;
    const h = data.hourly.time.indexOf(hourKey);
    if (h === -1) return [];
    const clouds = {
      low: data.hourly.cloud_cover_low[h],
      mid: data.hourly.cloud_cover_mid[h],
      high: data.hourly.cloud_cover_high[h],
    };
    const rainChance = data.hourly.precipitation_probability[h] ?? 0;
    return [
      {
        date,
        sunset: sunsetAt.slice(11, 16),
        ...rateSunset({ ...clouds, rain: rainChance }),
        temperature: Math.round(data.hourly.temperature_2m[h]),
        clouds,
        rainChance,
      },
    ];
  });
}
