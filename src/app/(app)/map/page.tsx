import { PageTransition } from "@/components/page-transition";

export default function Page() {
  return (
    <PageTransition>
      <main className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-md flex-col justify-center px-6">
        <h1 className="text-[2.125rem] leading-[1.05] font-semibold tracking-[-0.035em]">
          Map
        </h1>
        <p className="mt-3 max-w-[32ch] text-[1.0625rem] leading-snug text-haze">
          The sunset map is being set up.
        </p>
      </main>
    </PageTransition>
  );
}
