"use client";

import { BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActionButton } from "@/components/onboarding/action-button";
import { PermissionScreen } from "@/components/onboarding/permission-screen";
import { markOnboarded } from "@/lib/onboarding";
import { FORWARD } from "@/components/page-transition";

type State = "idle" | "asking" | "granted" | "denied" | "unsupported";

export default function NotificationsPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    // iPhone only offers notifications once the app is on the Home Screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!("Notification" in window)) setState("unsupported");
    else if (Notification.permission === "granted") setState("granted");
    else if (Notification.permission === "denied") setState("denied");
  }, []);

  const finish = () => {
    markOnboarded();
    router.replace("/home", { transitionTypes: FORWARD });
  };

  const ask = async () => {
    setState("asking");
    const result = await Notification.requestPermission();
    setState(result === "granted" ? "granted" : "denied");
  };

  const body: Record<State, string> = {
    idle: "We'll tell you when to leave so you reach your spot before the sun goes down.",
    asking: "We'll tell you when to leave so you reach your spot before the sun goes down.",
    granted: "Reminders are on. We'll nudge you before sunset at your spots.",
    denied: "Reminders are off. You can turn them on later in your settings.",
    unsupported:
      "To get reminders on iPhone, add Naplemente to your Home Screen first: tap Share, then Add to Home Screen.",
  };

  return (
    <PermissionScreen
      icon={<BellRing className="size-7" />}
      title="Get a nudge before the sun goes down"
      body={body[state]}
    >
      {state === "idle" || state === "asking" ? (
        <>
          <ActionButton onClick={ask} disabled={state === "asking"}>
            {state === "asking" ? "Waiting for your answer…" : "Turn on reminders"}
          </ActionButton>
          <ActionButton variant="quiet" onClick={finish}>
            Not now
          </ActionButton>
        </>
      ) : (
        <ActionButton onClick={finish}>Start exploring</ActionButton>
      )}
    </PermissionScreen>
  );
}
