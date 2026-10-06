import Link from "next/link";
import { Button, RpgArrowLeft, RpgGhost, RpgIconFrame } from "@/design-system";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
      <RpgIconFrame size="xl" shape="circle" rarity="epic" glow>
        <RpgGhost className="w-8 h-8 text-purple-300 animate-pulse" />
      </RpgIconFrame>
      <h2 className="font-pixel text-2xl text-rpg-gold">404 - Território Inexplorado</h2>
      <p className="font-sans text-sm text-slate-300 max-w-md">
        As runas que você procura não foram encontradas nos registros do reino.
      </p>
      <Link href="/">
        <Button variant="primary" size="md" className="gap-2">
          <RpgArrowLeft className="w-4 h-4" />
          <span>Retornar à Taverna</span>
        </Button>
      </Link>
    </div>
  );
}
