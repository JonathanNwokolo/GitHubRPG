import type { Metadata } from "next";
import { LandingHero } from "@/features/landing/LandingHero";
import { resolveDataSourceKind } from "@/data/datasource";
import { buildLandingMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildLandingMetadata();

export default function HomePage() {
  // The demo personas are mock profiles: they only make sense while the mock source is active.
  const showDemoPersonas = resolveDataSourceKind() === "mock";

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full">
      <LandingHero showDemoPersonas={showDemoPersonas} />
    </div>
  );
}
