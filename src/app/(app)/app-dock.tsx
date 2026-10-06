"use client";

import { Map, MessageCircle, Sunset, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { BACK, FORWARD } from "@/components/page-transition";
import { FloatingDock, type DockItem } from "@/components/ui/floating-dock";
import { LiquidSurface } from "@/components/ui/liquid-surface";

const ITEMS: DockItem[] = [
  { title: "Map", href: "/map", icon: <Map strokeWidth={1.75} /> },
  { title: "Sunset", href: "/sunset", icon: <Sunset strokeWidth={1.75} /> },
  { title: "Friends", href: "/friends", icon: <MessageCircle strokeWidth={1.75} /> },
  { title: "Profile", href: "/profile", icon: <UserRound strokeWidth={1.75} /> },
];

export function AppDock() {
  const pathname = usePathname();
  // A chat has its own message bar at the bottom.
  if (pathname.startsWith("/friends/")) return null;

  // Tabs to the right slide in from the right, tabs to the left from the left.
  const current = ITEMS.findIndex((item) => item.href === pathname);
  const items = ITEMS.map((item, index) => ({
    ...item,
    transitionTypes: index > current ? FORWARD : index < current ? BACK : undefined,
  }));

  return (
    <div
      style={{ viewTransitionName: "app-dock" }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <LiquidSurface radius={999} className="pointer-events-auto">
        <FloatingDock
          items={items}
          activeHref={pathname}
          className="border-transparent bg-transparent backdrop-blur-none"
        />
      </LiquidSurface>
    </div>
  );
}
