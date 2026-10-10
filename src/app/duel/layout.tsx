import React from "react";
import { DuelScene } from "@/features/duel/DuelScene";

export default function DuelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center w-full">
      <DuelScene>{children}</DuelScene>
    </div>
  );
}
