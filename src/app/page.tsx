import { LandingHero } from "@/features/landing/LandingHero";
import { resolveDataSourceKind } from "@/data/datasource";

export const dynamic = "force-dynamic";

export default function HomePage() {
  // The demo personas are mock profiles: they only make sense while the mock source is active.
  const showDemoPersonas = resolveDataSourceKind() === "mock";

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full">
      <LandingHero showDemoPersonas={showDemoPersonas} />
    </div>
  );
}
