"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ActionButton } from "@/components/onboarding/action-button";
import { Field } from "@/components/onboarding/field";
import { Screen } from "@/components/onboarding/screen";
import { updatePassword } from "@/lib/auth";
import { FORWARD } from "@/components/page-transition";

const MIN_PASSWORD = 8;

// People land here from the reset link in their email.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updatePassword(password);
    setSaving(false);
    if (result.status === "signed-in") router.replace("/home", { transitionTypes: FORWARD });
    if (result.status === "error") setError(result.message);
  };

  return (
    <Screen>
      <form noValidate onSubmit={submit} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.035em]">
            Choose a new password
          </h1>
          <Field
            label="New password"
            icon={<Lock />}
            type="password"
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD} characters.`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            valid={password.length >= MIN_PASSWORD}
            className="mt-8"
          />
        </div>
        <ActionButton type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save password"}
        </ActionButton>
      </form>
    </Screen>
  );
}
