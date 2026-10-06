"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AFTER_AUTH_PATH, continueWithProvider, type Provider } from "@/lib/auth";
import { ActionButton, ActionLink } from "./action-button";
import { AppleIcon, GoogleIcon } from "./provider-icons";

export function ProviderButtons({ emailHref }: { emailHref?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = async (provider: Provider) => {
    setPending(provider);
    setError(null);
    const result = await continueWithProvider(provider);
    if (result.status === "signed-in") router.push(AFTER_AUTH_PATH);
    if (result.status === "error") {
      setError(result.message);
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ActionButton
        variant="secondary"
        icon={<AppleIcon />}
        disabled={pending !== null}
        onClick={() => go("apple")}
      >
        {pending === "apple" ? "Opening Apple…" : "Continue with Apple"}
      </ActionButton>
      <ActionButton
        variant="secondary"
        icon={<GoogleIcon />}
        disabled={pending !== null}
        onClick={() => go("google")}
      >
        {pending === "google" ? "Opening Google…" : "Continue with Google"}
      </ActionButton>
      {emailHref && (
        <ActionLink
          href={emailHref}
          variant="secondary"
          icon={<Mail aria-hidden className="size-5" />}
        >
          Continue with email
        </ActionLink>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
