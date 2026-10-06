export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Until the Supabase keys are added, the app runs in demo mode:
 * every auth step succeeds locally so the onboarding can be clicked through.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
