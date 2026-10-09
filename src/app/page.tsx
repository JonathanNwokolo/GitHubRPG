import type { Metadata } from "next";
import { LandingHero } from "@/features/landing/LandingHero";
import { HeroesHall } from "@/features/heroes/HeroesHall";
import { HomeScene } from "@/features/landing/HomeScene";
import { resolveDataSourceKind } from "@/data/datasource";
import { buildLandingMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildLandingMetadata();

export default function HomePage() {
  // The demo personas are mock profiles: they only make sense while the mock source is active.
  const showDemoPersonas = resolveDataSourceKind() === "mock";

  return (
    <div className="flex-1 flex flex-col items-center w-full">
      <HomeScene sanctumAnchorId="heroes-hall">
        <LandingHero showDemoPersonas={showDemoPersonas} />
        <HeroesHall />
      </HomeScene>
    </div>
  );
}
