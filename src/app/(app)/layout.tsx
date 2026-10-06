import { AppDock } from "./app-dock";

// Every main tab shares the dock; it stays put while the tabs change.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-28">{children}</div>
      <AppDock />
    </>
  );
}
