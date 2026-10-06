"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getTimes } from "suncalc";
import { ActionButton } from "@/components/onboarding/action-button";
import { PermissionScreen } from "@/components/onboarding/permission-screen";

const NEXT = "/permissions/notifications";

type State =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "granted"; sunset: Date | null }
  | { kind: "denied" };

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const validDate = (date: Date | null) =>
  date && !Number.isNaN(date.getTime()) ? date : null;

/** Today's sunset, or tomorrow's if it already happened; null near the poles. */
function nextSunset({ latitude, longitude }: GeolocationCoordinates) {
  const now = new Date();
  const today = validDate(getTimes(now, latitude, longitude).sunset);
  if (!today || today > now) return today;
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return validDate(getTimes(tomorrow, latitude, longitude).sunset);
}

export default function LocationPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  const ask = () => {
    if (!("geolocation" in navigator)) {
      setState({ kind: "denied" });
      return;
    }
    setState({ kind: "asking" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setState({ kind: "granted", sunset: nextSunset(coords) });
      },
      () => setState({ kind: "denied" }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };

  if (state.kind === "granted") {
    const { sunset } = state;
    const day = sunset?.toDateString() === new Date().toDateString() ? "today" : "tomorrow";
    return (
      <PermissionScreen
        step={{ current: 1, total: 2 }}
        icon={<MapPin className="size-7" />}
        title={
          sunset
            ? `Sunset here ${day} is at ${timeFormat.format(sunset)}`
            : "The sun doesn't set here today"
        }
        body="Every spot you save will show its own sunset time like this."
      >
        <ActionButton onClick={() => router.push(NEXT)}>Continue</ActionButton>
      </PermissionScreen>
    );
  }

  return (
    <PermissionScreen
      step={{ current: 1, total: 2 }}
      icon={<MapPin className="size-7" />}
      title="See tonight's sunset from where you are"
      body={
        state.kind === "denied" ? (
          <>
            Location is off, so we can&apos;t show sunset times near you. You
            can turn it on later in your browser or phone settings.
          </>
        ) : (
          <>
            Naplemente uses your location to show sunset times and spots
            nearby. It&apos;s only shared when you share a spot.
          </>
        )
      }
    >
      {state.kind === "denied" ? (
        <ActionButton onClick={() => router.push(NEXT)}>Continue</ActionButton>
      ) : (
        <>
          <ActionButton onClick={ask} disabled={state.kind === "asking"}>
            {state.kind === "asking" ? "Finding you…" : "Allow location"}
          </ActionButton>
          <ActionButton variant="quiet" onClick={() => router.push(NEXT)}>
            Not now
          </ActionButton>
        </>
      )}
    </PermissionScreen>
  );
}
