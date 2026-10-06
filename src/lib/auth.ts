import { getSupabase } from "./supabase/client";

export type Provider = "apple" | "google";

export type AuthResult =
  | { status: "signed-in" }
  | { status: "check-email" }
  | { status: "redirecting" }
  | { status: "error"; message: string };

/** Where people land after any sign-in: the first permission screen. */
export const AFTER_AUTH_PATH = "/permissions/location";

function callbackUrl() {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(AFTER_AUTH_PATH)}`;
}

export async function continueWithProvider(
  provider: Provider,
): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { status: "signed-in" };

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl() },
  });
  if (error) return { status: "error", message: error.message };
  return { status: "redirecting" };
}

export async function signUpWithEmail(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { status: "signed-in" };

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { name: input.name },
      emailRedirectTo: callbackUrl(),
    },
  });
  if (error) return { status: "error", message: error.message };
  // No session means the project asks people to confirm their email first.
  return data.session ? { status: "signed-in" } : { status: "check-email" };
}

export async function logInWithEmail(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { status: "signed-in" };

  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) return { status: "error", message: error.message };
  return { status: "signed-in" };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { status: "check-email" };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });
  if (error) return { status: "error", message: error.message };
  return { status: "check-email" };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { status: "signed-in" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: error.message };
  return { status: "signed-in" };
}
