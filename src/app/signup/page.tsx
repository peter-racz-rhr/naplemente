import Link from "next/link";
import { DemoNote } from "@/components/onboarding/demo-note";
import { ProviderButtons } from "@/components/onboarding/provider-buttons";
import { Screen } from "@/components/onboarding/screen";
import { FORWARD } from "@/components/page-transition";

export default function SignupPage() {
  return (
    <Screen back>
      <div className="flex flex-1 flex-col justify-end gap-8 pb-4">
        <div>
          <h1 className="text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.035em]">
            Create an account
          </h1>
          <p className="mt-3 text-[1.0625rem] leading-snug text-haze">
            Your spots stay with you on every device, and you can share the
            best ones.
          </p>
        </div>
        <DemoNote />
        <ProviderButtons emailHref="/signup/email" />
        <p className="text-center text-[0.9375rem] text-haze">
          Already have an account?{" "}
          <Link href="/login" transitionTypes={FORWARD} className="font-semibold text-ink">
            Log in
          </Link>
        </p>
      </div>
    </Screen>
  );
}
