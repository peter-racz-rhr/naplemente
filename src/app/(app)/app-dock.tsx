"use client";

import { Compass, Map, Plus, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { FloatingDock, type DockItem } from "@/components/ui/floating-dock";

const ITEMS: DockItem[] = [
  { title: "Tonight", href: "/home", icon: <Compass strokeWidth={1.75} /> },
  { title: "Map", href: "/map", icon: <Map strokeWidth={1.75} /> },
  { title: "Save a spot", href: "/add", icon: <Plus strokeWidth={2} /> },
  { title: "You", href: "/profile", icon: <UserRound strokeWidth={1.75} /> },
];

export function AppDock() {
  const pathname = usePathname();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <FloatingDock
        items={ITEMS}
        activeHref={pathname}
        className="pointer-events-auto"
      />
    </div>
  );
}
