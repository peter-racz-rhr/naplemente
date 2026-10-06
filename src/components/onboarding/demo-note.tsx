import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Shown on auth screens until Supabase keys are added. */
export function DemoNote() {
  if (isSupabaseConfigured) return null;
  return (
    <p className="rounded-2xl bg-dusk px-4 py-3 text-sm leading-snug text-haze">
      Demo mode: accounts aren&apos;t saved yet. Every option lets you continue
      so you can try the flow.
    </p>
  );
}
