"use client";

import { Map, MessageCircle, Sunset, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { BACK, FORWARD } from "@/components/page-transition";
import { FloatingDock, type DockItem } from "@/components/ui/floating-dock";
import { SOCIAL_ENABLED } from "@/lib/features";
import { LiquidSurface } from "@/components/ui/liquid-surface";

const ITEMS: DockItem[] = [
  { title: "Map", href: "/map", icon: <Map strokeWidth={1.75} /> },
  { title: "Sunset", href: "/sunset", icon: <Sunset strokeWidth={1.75} /> },
  ...(SOCIAL_ENABLED
    ? [{ title: "Friends", href: "/friends", icon: <MessageCircle strokeWidth={1.75} /> }]
    : []),
  { title: "Profile", href: "/profile", icon: <UserRound strokeWidth={1.75} /> },
];

export function AppDock() {
  const pathname = usePathname();
  // Chats and spot pages are full-screen with their own back button.
  if (pathname.startsWith("/friends/") || pathname.startsWith("/spots/")) return null;

  // Tabs to the right slide in from the right, tabs to the left from the left.
  const current = ITEMS.findIndex((item) => item.href === pathname);
  const items = ITEMS.map((item, index) => ({
    ...item,
    transitionTypes: index > current ? FORWARD : index < current ? BACK : undefined,
  }));

  return (
    // No view-transition-name here: it would make this wrapper a backdrop
    // root and the liquid glass could no longer see (and bend) the page.
    <div
      className="app-dock pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)] transition-[translate,opacity,visibility] duration-300 ease-out"
    >
      {/* Scales with the screen, with room on each side, up to a comfortable maximum */}
      <div className="relative w-[min(calc(100vw-5rem),22rem)]">
        {/* Pages can put a control here (the map's center-on-me button):
            it sits just above the dock, lined up with its right edge. */}
        <div id="dock-accessory" className="pointer-events-auto absolute right-0 bottom-full mb-3" />
        <LiquidSurface radius={999} className="pointer-events-auto w-full">
          <FloatingDock
            items={items}
            activeHref={pathname}
            className="w-full border-transparent bg-transparent backdrop-blur-none"
          />
        </LiquidSurface>
      </div>
    </div>
  );
}
