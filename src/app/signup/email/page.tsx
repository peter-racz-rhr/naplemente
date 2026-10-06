"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ActionButton, ActionLink } from "@/components/onboarding/action-button";
import { Field } from "@/components/onboarding/field";
import { Screen } from "@/components/onboarding/screen";
import { AFTER_AUTH_PATH, signUpWithEmail } from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export default function EmailSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const nameOk = name.trim().length > 0;
  const emailOk = EMAIL_PATTERN.test(email.trim());
  const passwordOk = password.length >= MIN_PASSWORD;

  const errors = {
    name: touched.name && !nameOk ? "Enter your name." : null,
    email:
      touched.email && !emailOk ? "Enter an email like name@example.com." : null,
    password:
      touched.password && !passwordOk
        ? `Use at least ${MIN_PASSWORD} characters.`
        : null,
  };

  const blur = (field: string) => () =>
    setTouched((t) => ({ ...t, [field]: true }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!nameOk || !emailOk || !passwordOk) return;

    setSubmitting(true);
    setFormError(null);
    const result = await signUpWithEmail({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setSubmitting(false);

    if (result.status === "signed-in") router.push(AFTER_AUTH_PATH);
    if (result.status === "check-email") setSentTo(email.trim());
    if (result.status === "error") setFormError(result.message);
  };

  if (sentTo) {
    return (
      <Screen>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <MailCheck aria-hidden className="size-10 text-gold" />
          <h1 className="text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.035em]">
            Check your inbox
          </h1>
          <p className="text-[1.0625rem] leading-snug text-haze">
            We sent a link to <span className="text-ink">{sentTo}</span>. Open
            it to confirm your account. You can finish setting up the app in
            the meantime.
          </p>
        </div>
        <ActionLink href={AFTER_AUTH_PATH}>Continue setup</ActionLink>
      </Screen>
    );
  }

  return (
    <Screen
      back
      aside={
        <p className="text-[0.9375rem] text-haze">
          Have an account?{" "}
          <Link href="/login" className="font-semibold text-ink">
            Log in
          </Link>
        </p>
      }
    >
      <form noValidate onSubmit={submit} className="flex flex-1 flex-col">
        <h1 className="mt-6 text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.035em]">
          Sign up with email
        </h1>

        <div className="mt-8 flex flex-col gap-5">
          <Field
            label="Name"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={blur("name")}
            error={errors.name}
            valid={nameOk}
          />
          <Field
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={blur("email")}
            error={errors.email}
            valid={emailOk}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD} characters.`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={blur("password")}
            error={errors.password}
            valid={passwordOk}
          />
        </div>

        {formError && (
          <p role="alert" className="mt-5 text-sm text-error">
            {formError}
          </p>
        )}

        <div className="mt-auto pt-8">
          <ActionButton type="submit" disabled={submitting}>
            {submitting ? "Creating your account…" : "Create account"}
          </ActionButton>
        </div>
      </form>
    </Screen>
  );
}
