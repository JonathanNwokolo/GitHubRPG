import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RpgAlert } from "../icons/RpgIcons";
import { RpgIconFrame } from "../icons/RpgIconFrame";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Anomalia Mágica Detectada",
  message = "Não foi possível resgatar os dados do plano cósmico.",
  onRetry,
  retryLabel = "Tentar Novamente",
  className,
}) => {
  return (
    <div
      role="alert"
      className={twMerge(
        clsx(
          "w-full flex flex-col items-center justify-center p-8 text-center bg-rpg-obsidian border-2 border-rpg-crimson text-rpg-parchment shadow-pixel-crimson",
          className
        )
      )}
    >
      <div className="mb-3">
        <RpgIconFrame size="lg" shape="shield" rarity="crimson" glow>
          <RpgAlert className="w-7 h-7 text-red-400" />
        </RpgIconFrame>
      </div>
      <h3 className="font-sans font-bold text-base sm:text-lg text-red-400 tracking-wide mb-2">
        {title}
      </h3>
      <p className="font-sans text-sm text-slate-300 max-w-md mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
