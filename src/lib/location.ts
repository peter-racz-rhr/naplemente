export type Coordinates = { latitude: number; longitude: number };

/** Whether the browser already has an answer, so we don't ask twice. */
export async function locationPermission(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    // Older Safari has no Permissions API for geolocation.
    return "unknown";
  }
}

export function requestLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  });
}
