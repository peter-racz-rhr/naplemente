import { Wordmark } from "@/components/wordmark";
import { Screen } from "@/components/onboarding/screen";

// Placeholder until the spots list, map and navigation bar are built.
export default function HomePage() {
  return (
    <Screen>
      <div className="flex h-12 items-center">
        <Wordmark className="text-[1.5rem]" />
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.035em]">
          No spots yet
        </h1>
        <p className="mt-3 max-w-[32ch] text-[1.0625rem] leading-snug text-haze">
          Next time you catch a good sunset, save where you were. Saving spots
          is coming in the next build.
        </p>
      </div>
    </Screen>
  );
}
