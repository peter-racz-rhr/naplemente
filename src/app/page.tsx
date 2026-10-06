"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Wordmark } from "@/components/wordmark";
import { hasOnboarded } from "@/lib/onboarding";

// Splash: just the name, while the globe starts loading in the background.
export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    void import("@/components/ui/3d-globe");
    const target = hasOnboarded() ? "/map" : "/welcome";
    router.prefetch(target);
    const timer = window.setTimeout(() => router.replace(target), 1400);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-night">
      <h1 className="animate-in fade-in duration-700">
        <Wordmark />
      </h1>
    </main>
  );
}
