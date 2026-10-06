"use client";

import { Lock, LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ActionButton } from "@/components/onboarding/action-button";
import { DemoNote } from "@/components/onboarding/demo-note";
import { Field } from "@/components/onboarding/field";
import { AppleIcon, GoogleIcon } from "@/components/onboarding/provider-icons";
import { Screen } from "@/components/onboarding/screen";
import { BACK, FORWARD } from "@/components/page-transition";
import {
  AFTER_AUTH_PATH,
  continueWithProvider,
  logInWithEmail,
  sendPasswordReset,
  type Provider,
} from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Notice = { tone: "error" | "info"; text: string } | null;

function LoginCard() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "reset" | Provider | null>(null);
  const [notice, setNotice] = useState<Notice>(
    params.get("error") === "auth"
      ? { tone: "error", text: "That sign-in link didn't work. Try again." }
      : null,
  );

  const emailOk = EMAIL_PATTERN.test(email.trim());

  const logIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setNotice({ tone: "error", text: "Enter your email and password." });
      return;
    }
    if (!emailOk) {
      setNotice({ tone: "error", text: "Enter an email like name@example.com." });
      return;
    }
    setBusy("email");
    setNotice(null);
    const result = await logInWithEmail({ email: email.trim(), password });
    setBusy(null);
    if (result.status === "signed-in") router.push(AFTER_AUTH_PATH, { transitionTypes: FORWARD });
    if (result.status === "error") setNotice({ tone: "error", text: result.message });
  };

  const forgotPassword = async () => {
    if (!emailOk) {
      setNotice({
        tone: "error",
        text: "Enter your email above, then tap Forgot password again.",
      });
      return;
    }
    setBusy("reset");
    setNotice(null);
    const result = await sendPasswordReset(email.trim());
    setBusy(null);
    setNotice(
      result.status === "error"
        ? { tone: "error", text: result.message }
        : { tone: "info", text: `We sent a reset link to ${email.trim()}.` },
    );
  };

  const withProvider = async (provider: Provider) => {
    setBusy(provider);
    setNotice(null);
    const result = await continueWithProvider(provider);
    if (result.status === "signed-in") router.push(AFTER_AUTH_PATH, { transitionTypes: FORWARD });
    if (result.status === "error") {
      setBusy(null);
      setNotice({ tone: "error", text: result.message });
    }
  };

  return (
    <div className="rounded-[1.75rem] border border-dusk-edge bg-dusk/60 p-6">
      <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-night text-ink">
        <LogIn aria-hidden className="size-6" />
      </div>
      <h1 className="text-center text-[1.75rem] leading-tight font-semibold tracking-[-0.03em]">
        Log in with email
      </h1>
      <p className="mt-2 text-center text-[1rem] leading-snug text-haze">
        Welcome back. Your spots are waiting.
      </p>

      <form noValidate onSubmit={logIn} className="mt-6 flex flex-col gap-3">
        <Field
          label="Email"
          hideLabel
          placeholder="Email"
          icon={<Mail />}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="[&_input]:bg-night"
        />
        <Field
          label="Password"
          hideLabel
          placeholder="Password"
          icon={<Lock />}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="[&_input]:bg-night"
        />

        <div className="flex min-h-11 items-start justify-between gap-4">
          <p
            role={notice ? (notice.tone === "error" ? "alert" : "status") : undefined}
            className={notice?.tone === "error" ? "pt-2 text-sm text-error" : "pt-2 text-sm text-ok"}
          >
            {notice?.text}
          </p>
          <button
            type="button"
            onClick={forgotPassword}
            disabled={busy !== null}
            className="shrink-0 py-2 text-sm font-semibold text-ink hover:underline"
          >
            {busy === "reset" ? "Sending…" : "Forgot password?"}
          </button>
        </div>

        <ActionButton type="submit" disabled={busy !== null}>
          {busy === "email" ? "Logging in…" : "Log in"}
        </ActionButton>
      </form>

      <div className="my-5 flex items-center gap-3 text-sm text-haze">
        <span className="flex-1 border-t border-dashed border-dusk-edge" />
        Or log in with
        <span className="flex-1 border-t border-dashed border-dusk-edge" />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          aria-label="Continue with Google"
          disabled={busy !== null}
          onClick={() => withProvider("google")}
          className="grid h-14 grow place-items-center rounded-2xl border border-dusk-edge bg-night hover:border-haze/60 disabled:opacity-60"
        >
          <GoogleIcon />
        </button>
        <button
          type="button"
          aria-label="Continue with Apple"
          disabled={busy !== null}
          onClick={() => withProvider("apple")}
          className="grid h-14 grow place-items-center rounded-2xl border border-dusk-edge bg-night text-ink hover:border-haze/60 disabled:opacity-60"
        >
          <AppleIcon />
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Screen back>
      <div className="flex flex-1 flex-col justify-center gap-5 py-4">
        <Suspense>
          <LoginCard />
        </Suspense>
        <DemoNote />
      </div>
      <p className="text-center text-[0.9375rem] text-haze">
        New here?{" "}
        <Link href="/welcome?intro=skip" transitionTypes={BACK} className="font-semibold text-ink">
          Create an account
        </Link>
      </p>
    </Screen>
  );
}
