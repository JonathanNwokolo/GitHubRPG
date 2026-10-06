import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RpgGhost } from "../icons/RpgIcons";
import { RpgIconFrame } from "../icons/RpgIconFrame";

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "Vazio Cósmico",
  message = "Nenhum artefato ou rastro foi encontrado neste quadrante.",
  icon,
  action,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          "w-full flex flex-col items-center justify-center p-8 text-center bg-rpg-void border-2 border-dashed border-rpg-border text-rpg-parchment",
          className
        )
      )}
    >
      <div className="mb-3">
        {icon || (
          <RpgIconFrame size="lg" shape="circle" rarity="arcane" glow>
            <RpgGhost className="w-7 h-7 text-purple-300 animate-pulse" />
          </RpgIconFrame>
        )}
      </div>
      <h3 className="font-sans font-bold text-base text-slate-200 uppercase tracking-wide mb-2">
        {title}
      </h3>
      <p className="font-sans text-sm text-slate-300 max-w-sm mb-4 leading-relaxed">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
