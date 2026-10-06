"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ActionButton } from "@/components/onboarding/action-button";
import { DemoNote } from "@/components/onboarding/demo-note";
import { Field } from "@/components/onboarding/field";
import { ProviderButtons } from "@/components/onboarding/provider-buttons";
import { Screen } from "@/components/onboarding/screen";
import { AFTER_AUTH_PATH, logInWithEmail } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "auth"
      ? "That sign-in link didn't work. Try again."
      : null,
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await logInWithEmail({ email: email.trim(), password });
    setSubmitting(false);
    if (result.status === "signed-in") router.push(AFTER_AUTH_PATH);
    if (result.status === "error") setError(result.message);
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <Field
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <ActionButton type="submit" disabled={submitting}>
        {submitting ? "Logging in…" : "Log in"}
      </ActionButton>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Screen back>
      <div className="flex flex-1 flex-col gap-8 pt-6 pb-4">
        <h1 className="text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.035em]">
          Welcome back
        </h1>
        <DemoNote />
        <ProviderButtons />
        <div className="flex items-center gap-4 text-sm text-haze">
          <span className="h-px flex-1 bg-dusk-edge" />
          or with email
          <span className="h-px flex-1 bg-dusk-edge" />
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-auto text-center text-[0.9375rem] text-haze">
          New here?{" "}
          <Link href="/welcome?intro=skip" className="font-semibold text-ink">
            Create an account
          </Link>
        </p>
      </div>
    </Screen>
  );
}
