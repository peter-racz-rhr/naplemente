import { redirect } from "next/navigation";
import { SOCIAL_ENABLED } from "@/lib/features";

// While friends and chat are paused, old links land on the map instead.
export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  if (!SOCIAL_ENABLED) redirect("/map");
  return children;
}
