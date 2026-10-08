"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  RpgAlert,
  RpgAnvil,
  RpgClassIcon,
  RpgCompass,
  RpgCrown,
  RpgHeart,
  RpgMana,
  RpgShare,
  RpgSparkles,
  RpgSword,
  RpgSwords,
  RpgTrophy,
  RpgZap,
} from "@/design-system";
import { CharacterApiError, fetchCharacter } from "@/data/api/fetchCharacter";
import { FramedAvatar } from "@/features/avatar";
import { ProfileMeter } from "@/features/profile-ui";
import { RPGButton, RPGDivider, RPGPanel } from "@/features/rpg-ui";
import type { RPGCharacter } from "@/game/types";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { DuelVsBadge } from "./DuelVsBadge";
import { createDuel } from "./engine";
import type { DuelRound as DuelRoundType, DuelSide } from "./engine";

type LoadState =
  | { status: "loading" }
  | { status: "success"; character: RPGCharacter }
  | { status: "error"; error: unknown };

const ROUND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  journey: RpgCompass,
  arsenal: RpgSword,
  forge: RpgAnvil,
  legacy: RpgCrown,
  signature: RpgSparkles,
};

function roundHighlight(hero: DuelRoundType["heroA"], t: ReturnType<typeof getTranslation>["duel"]): string {
  const highlight = hero.highlight;
  if (highlight.kind === "journey") {
    return t.journeyHighlight.replace("{years}", highlight.years.toFixed(1)).replace("{level}", String(highlight.level));
  }
  if (highlight.kind === "skill") return highlight.name;
  if (highlight.kind === "repositories") return t.repositoriesHighlight.replace("{value}", String(highlight.value));
  if (highlight.kind === "stars") return t.starsHighlight.replace("{value}", String(highlight.value));
  return highlight.subclassName ? `${highlight.className} / ${highlight.subclassName}` : highlight.className;
}

function HeroCard({
  character,
  hp,
  side,
}: {
  character: RPGCharacter;
  hp: number;
  side: "A" | "B";
}) {
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const isPt = language === "pt-BR";
  const name = character.identity.displayName || character.identity.username;

  return (
    <RPGPanel
      variant="standard"
      as="article"
      className="relative flex flex-col p-5 sm:p-7 text-center overflow-hidden"
    >
      {/* Top Banner: Challenger Slot & Level */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-900/30 pb-3">
        <span className="border border-amber-500/40 bg-rpg-void/90 px-2.5 py-1 font-pixel text-[9px] sm:text-[10px] uppercase tracking-wider text-amber-300">
          {side === "A" ? (isPt ? "CAMPEÃO I" : "CHAMPION I") : isPt ? "CAMPEÃO II" : "CHAMPION II"}
        </span>
        <span className="border border-rpg-goldDark/70 bg-rpg-void/90 px-2.5 py-1 font-mono text-xs font-bold text-amber-200">
          {t.level} {character.progression.level}
        </span>
      </div>

      {/* Avatar Protagonist with Glow */}
      <div className="my-3 flex justify-center">
        <div className="rpg-avatar-glow">
          <FramedAvatar
            username={character.identity.username}
            avatarUrl={character.identity.avatarUrl}
            alt=""
            className="mx-auto h-32 w-32 sm:h-40 sm:w-40"
            priority
            fallback={
              <span className="font-pixel text-rpg-gold" aria-hidden="true">
                {name.slice(0, 2).toUpperCase()}
              </span>
            }
          />
        </div>
      </div>

      {/* Champion Identity */}
      <h2 className="mt-1 break-words font-pixel text-base sm:text-xl leading-relaxed text-amber-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        {name}
      </h2>
      <p className="font-mono text-xs text-amber-500/80">@{character.identity.username}</p>

      {/* Class and Subclass Badge */}
      <div className="mt-3 flex justify-center">
        <div className="inline-flex items-center gap-1.5 border border-rpg-goldDark/50 bg-rpg-void/80 px-3 py-1 text-xs">
          <RpgClassIcon classNameType={character.archetype.className} className="h-4 w-4 text-amber-300" />
          <span className="font-bold uppercase tracking-wider text-amber-300">
            {character.archetype.className}
          </span>
          {character.archetype.subclassName ? (
            <>
              <span className="text-slate-600" aria-hidden="true">&bull;</span>
              <span className="font-medium text-slate-300">{character.archetype.subclassName}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Combat Gauges: HP & MP */}
      <div className="mt-5 space-y-3 text-left">
        {/* Arena HP Bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-sans">
            <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-red-200">
              <RpgHeart className="h-3.5 w-3.5 text-rpg-crimson" /> {t.hp}
            </span>
            <span className="font-mono text-xs font-bold text-red-300">
              {Math.round(hp)} / 100
            </span>
          </div>
          <ProfileMeter value={hp} max={100} tone="hp" size="md" aria-label={t.hp} />
        </div>

        {/* MP Bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-sans">
            <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-cyan-200">
              <RpgMana className="h-3.5 w-3.5 text-cyan-400" /> {t.mp}
            </span>
            <span className="font-mono text-xs font-bold text-cyan-300">
              {Math.round(character.resources.mp)} / {character.resources.maxMp}
            </span>
          </div>
          <ProfileMeter
            value={character.resources.mp}
            max={character.resources.maxMp}
            tone="mp"
            size="sm"
            aria-label={t.mp}
          />
        </div>
      </div>

      {/* Link to Full Character Sheet */}
      <div className="mt-5 border-t border-amber-900/30 pt-3 text-center">
        <Link
          href={`/${encodeURIComponent(character.identity.username)}`}
          className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-amber-300"
        >
          <span>{isPt ? "Ver Ficha Completa" : "View Full Sheet"}</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </RPGPanel>
  );
}

function DuelRound({
  round,
  index,
  usernames,
}: {
  round: DuelRoundType;
  index: number;
  usernames: Record<DuelSide, string>;
}) {
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const isPt = language === "pt-BR";
  const RoundIcon = ROUND_ICONS[round.id] || RpgSwords;

  const isWinnerA = round.winner === "A";
  const isWinnerB = round.winner === "B";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      aria-label={`${t.round} ${index + 1}: ${t.rounds[round.id]}`}
      className="relative"
    >
      <RPGPanel variant="standard" className="p-5 sm:p-7">
        {/* Round Header / Quadro de Julgamento */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 border border-rpg-crimson/50 bg-red-950/40 px-3 py-1 mb-2">
            <span className="font-pixel text-[10px] uppercase tracking-widest text-red-300">
              {t.round} 0{index + 1}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-center gap-2">
            <RoundIcon className="h-5 w-5 text-amber-400" />
            <h3 className="font-pixel text-base sm:text-xl uppercase leading-relaxed text-amber-100">
              {t.rounds[round.id]}
            </h3>
          </div>

          <p className="mx-auto mt-2 max-w-xl font-sans text-xs sm:text-sm italic text-slate-300">
            {t.narratives[round.id]}
          </p>
        </div>

        {/* Separator */}
        <div className="my-5 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />

        {/* Clash Scoreboard: Hero A vs Hero B */}
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-6">
          {/* Side A Totem */}
          <div
            className={`relative border p-4 sm:p-5 text-center transition-all ${
              isWinnerA
                ? "border-amber-500/70 bg-gradient-to-b from-amber-950/30 to-rpg-void shadow-[0_0_18px_rgba(245,158,11,0.18)]"
                : "border-amber-900/30 bg-rpg-void/70"
            }`}
          >
            {isWinnerA ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-amber-500 px-2 py-0.5 font-pixel text-[8px] font-bold uppercase tracking-wider text-rpg-void shadow">
                {isPt ? "VITÓRIA NO ROUND" : "ROUND WINNER"}
              </div>
            ) : null}

            <p className="truncate font-mono text-xs font-bold text-amber-400/90">@{usernames.A}</p>
            <p
              className={`my-2 font-pixel text-3xl sm:text-4xl ${
                isWinnerA ? "text-amber-200 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-slate-100"
              }`}
            >
              {Math.round(round.heroA.power)}
            </p>
            <span className="block font-pixel text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-500">
              {isPt ? "PODER DO ROUND" : "ROUND POWER"}
            </span>

            <div className="mt-3 inline-block border border-amber-800/40 bg-rpg-void/80 px-2.5 py-1 text-xs font-semibold text-amber-300 break-words">
              {roundHighlight(round.heroA, t)}
            </div>

            <p className="mt-2 font-mono text-[11px] text-slate-400">
              {t.basePower.replace("{value}", String(Math.round(round.heroA.basePower)))}
            </p>

            {round.heroA.modifier ? (
              <p className="mt-2 inline-block border border-purple-800/40 bg-purple-950/40 px-2 py-0.5 text-[11px] text-purple-300">
                {t.abilities[round.heroA.modifier.abilityKey]} ·{" "}
                {t.classBonus.replace("{value}", String(round.heroA.modifier.amount))}
              </p>
            ) : null}
          </div>

          {/* Central Clash Mark */}
          <div className="flex flex-col items-center justify-center my-1 sm:my-0">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-amber-900/60 bg-rpg-void shadow-inner">
              <RpgSwords className="h-5 w-5 text-rpg-crimson" />
            </div>
            <span className="mt-1 font-pixel text-[9px] text-amber-500/80">VS</span>
          </div>

          {/* Side B Totem */}
          <div
            className={`relative border p-4 sm:p-5 text-center transition-all ${
              isWinnerB
                ? "border-amber-500/70 bg-gradient-to-b from-amber-950/30 to-rpg-void shadow-[0_0_18px_rgba(245,158,11,0.18)]"
                : "border-amber-900/30 bg-rpg-void/70"
            }`}
          >
            {isWinnerB ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-amber-500 px-2 py-0.5 font-pixel text-[8px] font-bold uppercase tracking-wider text-rpg-void shadow">
                {isPt ? "VITÓRIA NO ROUND" : "ROUND WINNER"}
              </div>
            ) : null}

            <p className="truncate font-mono text-xs font-bold text-amber-400/90">@{usernames.B}</p>
            <p
              className={`my-2 font-pixel text-3xl sm:text-4xl ${
                isWinnerB ? "text-amber-200 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-slate-100"
              }`}
            >
              {Math.round(round.heroB.power)}
            </p>
            <span className="block font-pixel text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-500">
              {isPt ? "PODER DO ROUND" : "ROUND POWER"}
            </span>

            <div className="mt-3 inline-block border border-amber-800/40 bg-rpg-void/80 px-2.5 py-1 text-xs font-semibold text-amber-300 break-words">
              {roundHighlight(round.heroB, t)}
            </div>

            <p className="mt-2 font-mono text-[11px] text-slate-400">
              {t.basePower.replace("{value}", String(Math.round(round.heroB.basePower)))}
            </p>

            {round.heroB.modifier ? (
              <p className="mt-2 inline-block border border-purple-800/40 bg-purple-950/40 px-2 py-0.5 text-[11px] text-purple-300">
                {t.abilities[round.heroB.modifier.abilityKey]} ·{" "}
                {t.classBonus.replace("{value}", String(round.heroB.modifier.amount))}
              </p>
            ) : null}
          </div>
        </div>

        {/* Round Verdict Bar */}
        <div
          className={`mt-6 flex items-center justify-center gap-2 border-t pt-3.5 font-pixel text-xs sm:text-sm uppercase tracking-wider ${
            round.winner === "draw" ? "border-slate-800 text-slate-300" : "border-amber-900/40 text-amber-300"
          }`}
        >
          {round.winner !== "draw" ? <RpgCrown className="h-4 w-4 text-amber-400" /> : null}
          <span>
            {round.winner === "draw" ? t.roundDraw : t.roundWinner.replace("{username}", usernames[round.winner])}
          </span>
        </div>
      </RPGPanel>
    </motion.article>
  );
}

function errorMessage(error: unknown, username: string, t: ReturnType<typeof getTranslation>["duel"]): string {
  if (error instanceof CharacterApiError) {
    if (error.code === "not_found") return t.notFound.replace("{username}", username);
    if (error.code === "rate_limited") return t.rateLimited;
  }
  return t.temporaryError.replace("{username}", username);
}

function LoadingOrError({ state, username, retry }: { state: LoadState; username: string; retry: () => void }) {
  const { language } = useUiStore();
  const t = getTranslation(language).duel;

  if (state.status === "loading") {
    return (
      <RPGPanel
        variant="standard"
        className="flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/40 bg-rpg-obsidian animate-pulse">
          <RpgSwords className="h-7 w-7 text-rpg-gold" />
        </div>
        <p role="status" className="font-sans text-sm text-slate-300">
          {t.loadingHero.replace("{username}", username)}
        </p>
      </RPGPanel>
    );
  }

  if (state.status === "error") {
    return (
      <RPGPanel
        variant="standard"
        className="border-rpg-crimson bg-red-950/30 p-8 text-center"
      >
        <div role="alert" className="flex flex-col items-center justify-center">
          <RpgAlert className="mb-2 h-7 w-7 text-rpg-crimson" />
          <p className="font-sans text-sm text-slate-200">{errorMessage(state.error, username, t)}</p>
          <div className="mt-4">
            <RPGButton variant="primary" size="sm" onClick={retry}>
              {t.retry}
            </RPGButton>
          </div>
        </div>
      </RPGPanel>
    );
  }

  return null;
}

export function DuelArena({ heroA, heroB }: { heroA: string; heroB: string }) {
  const { language, reducedMotion } = useUiStore();
  const t = getTranslation(language).duel;
  const isPt = language === "pt-BR";

  const systemReduced = useReducedMotion();
  const shouldReduce = reducedMotion === "reduced" || (reducedMotion === "system" && systemReduced);

  const [stateA, setStateA] = useState<LoadState>({ status: "loading" });
  const [stateB, setStateB] = useState<LoadState>({ status: "loading" });
  const [visibleRounds, setVisibleRounds] = useState(0);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const roundTimersRef = useRef<number[]>([]);

  const load = useCallback(
    (side: DuelSide) => {
      const username = side === "A" ? heroA : heroB;
      const setState = side === "A" ? setStateA : setStateB;
      const controller = new AbortController();
      setState({ status: "loading" });
      fetchCharacter(username, controller.signal).then(
        (character) => setState({ status: "success", character }),
        (error) => {
          if (!controller.signal.aborted) setState({ status: "error", error });
        }
      );
      return () => controller.abort();
    },
    [heroA, heroB]
  );

  useEffect(() => {
    const abortA = load("A");
    const abortB = load("B");
    return () => {
      abortA();
      abortB();
    };
  }, [load]);

  const duel = useMemo(
    () =>
      stateA.status === "success" && stateB.status === "success"
        ? createDuel(stateA.character, stateB.character)
        : null,
    [stateA, stateB]
  );

  const clearRoundTimers = useCallback(() => {
    roundTimersRef.current.forEach(window.clearTimeout);
    roundTimersRef.current = [];
  }, []);

  useEffect(() => {
    clearRoundTimers();
    if (!duel) {
      setVisibleRounds(0);
      return;
    }
    if (shouldReduce) {
      setVisibleRounds(duel.rounds.length);
      return;
    }
    setVisibleRounds(0);
    roundTimersRef.current = duel.rounds.map((_, index) =>
      window.setTimeout(() => setVisibleRounds(index + 1), 500 + index * 1800)
    );
    return clearRoundTimers;
  }, [duel, shouldReduce, clearRoundTimers]);

  // Cancel pending reveal timers first: a stale one would otherwise shrink visibleRounds and hide the result.
  const skipAnimation = () => {
    if (!duel) return;
    clearRoundTimers();
    setVisibleRounds(duel.rounds.length);
  };

  const finalVisible = Boolean(duel && visibleRounds >= duel.rounds.length);
  const hpA =
    duel && visibleRounds > 0
      ? duel.rounds[Math.min(visibleRounds, duel.rounds.length) - 1].heroA.hpAfter
      : 100;
  const hpB =
    duel && visibleRounds > 0
      ? duel.rounds[Math.min(visibleRounds, duel.rounds.length) - 1].heroB.hpAfter
      : 100;

  const share = async () => {
    const data = {
      title: t.shareTitle.replace("{heroA}", heroA).replace("{heroB}", heroB),
      text: t.shareText.replace("{heroA}", heroA).replace("{heroB}", heroB),
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else await navigator.clipboard.writeText(data.url);
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  };

  if (stateA.status !== "success" || stateB.status !== "success") {
    return (
      <div className="mx-auto max-w-5xl space-y-5" aria-live="polite">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {stateA.status === "success" ? (
            <HeroCard character={stateA.character} hp={100} side="A" />
          ) : (
            <LoadingOrError state={stateA} username={heroA} retry={() => load("A")} />
          )}
          {stateB.status === "success" ? (
            <HeroCard character={stateB.character} hp={100} side="B" />
          ) : (
            <LoadingOrError state={stateB} username={heroB} retry={() => load("B")} />
          )}
        </div>
      </div>
    );
  }

  if (!duel) return null;
  const usernames = { A: stateA.character.identity.username, B: stateB.character.identity.username };
  const winner = duel.winner === "draw" ? null : usernames[duel.winner];

  return (
    <div className="mx-auto max-w-5xl space-y-8 overflow-x-hidden sm:space-y-10">
      {/* Arena Stage Header */}
      <header className="relative text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-rpg-goldDark/70 bg-gradient-to-b from-rpg-surface via-rpg-obsidian to-rpg-void shadow-[0_0_20px_rgba(239,68,68,0.25)]">
          <RpgSwords className="h-7 w-7 sm:h-8 sm:w-8 text-rpg-crimson" />
        </div>

        <div className="inline-flex items-center gap-2 border border-amber-500/40 bg-amber-950/40 px-3 py-1 mb-2">
          <span className="font-pixel text-[10px] uppercase tracking-widest text-amber-300">
            {isPt ? "CONFRONTO DE LENDAS" : "CLASH OF LEGENDS"}
          </span>
        </div>

        <h1 className="font-pixel text-xl sm:text-3xl uppercase leading-relaxed text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {t.title}
        </h1>

        <RPGDivider className="my-5" maxWidth={400} />
      </header>

      {/* Hero Cards: Challenger Left vs Challenger Right */}
      <div className="grid grid-cols-1 items-center gap-5 sm:gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <HeroCard character={stateA.character} hp={hpA} side="A" />
        <div className="flex flex-col items-center justify-center py-2 sm:py-0">
          <DuelVsBadge size="lg" ariaLabel={t.versus} showWings={true} />
          <span className="mt-2 font-pixel text-[9px] uppercase tracking-widest text-rpg-crimson" aria-hidden="true">
            {t.versus}
          </span>
        </div>
        <HeroCard character={stateB.character} hp={hpB} side="B" />
      </div>

      {/* Skip Animation Toggle */}
      {!finalVisible ? (
        <div className="text-center">
          <button
            onClick={skipAnimation}
            className="inline-flex items-center gap-2 border border-amber-900/60 bg-rpg-surface/90 px-4 py-2 font-pixel text-[10px] uppercase tracking-wider text-amber-200 shadow-pixel hover:border-amber-500 hover:text-amber-100 transition-colors"
          >
            <RpgZap className="h-3.5 w-3.5 text-amber-400" />
            <span>{t.skipAnimation}</span>
          </button>
        </div>
      ) : null}

      {/* Rounds Sequence */}
      <div className="space-y-6" aria-live="polite" aria-atomic="false">
        {duel.rounds.slice(0, visibleRounds).map((round, index) => (
          <DuelRound key={round.id} round={round} index={index} usernames={usernames} />
        ))}
      </div>

      {/* Final Battle Outcome / Result Block */}
      {finalVisible ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <RPGPanel
            variant="legendary"
            as="section"
            aria-labelledby="duel-result-title"
            className="relative p-7 sm:p-12 text-center overflow-hidden"
          >
            {/* Ambient Triumphal Aura */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,rgba(240,164,58,0.12),transparent_70%)]"
            />

            {/* Victor Crest */}
            <div className="relative mx-auto mb-3 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 border-rpg-goldDark bg-gradient-to-b from-rpg-surface via-rpg-obsidian to-rpg-void shadow-[0_0_24px_rgba(245,158,11,0.3)]">
              {winner ? (
                <RpgTrophy className="h-8 w-8 sm:h-10 sm:w-10 text-rpg-gold" />
              ) : (
                <RpgCrown className="h-8 w-8 sm:h-10 sm:w-10 text-amber-400" />
              )}
            </div>

            <div className="inline-flex items-center gap-2 border border-amber-500/50 bg-amber-950/60 px-3.5 py-1 mb-3">
              <RpgCrown className="h-4 w-4 text-amber-400" />
              <span className="font-pixel text-[10px] uppercase tracking-widest text-amber-300">
                {t.result}
              </span>
            </div>

            <h2
              id="duel-result-title"
              className="font-pixel text-xl sm:text-3xl uppercase leading-relaxed text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-300 to-amber-600 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]"
            >
              {winner ? t.won.replace("{username}", winner) : t.legendaryDraw}
            </h2>

            {/* War Scoreboard Totem */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              {/* Score Side A */}
              <div
                className={`min-w-[120px] sm:min-w-[160px] border p-4 rounded-sm text-center transition-all ${
                  duel.scoreA > duel.scoreB
                    ? "border-amber-500 bg-amber-950/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    : "border-amber-900/30 bg-rpg-void/80 text-slate-300"
                }`}
              >
                <p className="font-mono text-xs truncate">@{usernames.A}</p>
                <span className="my-1 block font-pixel text-3xl sm:text-5xl font-bold">
                  {duel.scoreA}
                </span>
                <span className="block font-pixel text-[8px] uppercase tracking-wider text-slate-500">
                  {duel.scoreA === 1 ? (isPt ? "ROUND" : "ROUND") : isPt ? "ROUNDS" : "ROUNDS"}
                </span>
              </div>

              {/* Clash Divider */}
              <div className="flex flex-col items-center justify-center px-1 sm:px-2">
                <RpgSwords className="h-7 w-7 sm:h-9 sm:w-9 text-rpg-crimson" />
                <span className="font-pixel text-xs text-amber-500/70 mt-1">VS</span>
              </div>

              {/* Score Side B */}
              <div
                className={`min-w-[120px] sm:min-w-[160px] border p-4 rounded-sm text-center transition-all ${
                  duel.scoreB > duel.scoreA
                    ? "border-amber-500 bg-amber-950/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    : "border-amber-900/30 bg-rpg-void/80 text-slate-300"
                }`}
              >
                <p className="font-mono text-xs truncate">@{usernames.B}</p>
                <span className="my-1 block font-pixel text-3xl sm:text-5xl font-bold">
                  {duel.scoreB}
                </span>
                <span className="block font-pixel text-[8px] uppercase tracking-wider text-slate-500">
                  {duel.scoreB === 1 ? (isPt ? "ROUND" : "ROUND") : isPt ? "ROUNDS" : "ROUNDS"}
                </span>
              </div>
            </div>

            <RPGDivider className="my-6" maxWidth={400} />

            {/* Disclaimer */}
            <p className="mx-auto max-w-2xl border border-amber-900/20 bg-rpg-void/60 p-3 sm:p-4 text-xs sm:text-sm font-sans italic leading-relaxed text-slate-400">
              {t.disclaimer}
            </p>

            {/* Post-Duel Actions */}
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <RPGButton
                variant="duel"
                size="lg"
                onClick={share}
                aria-label={t.share}
              >
                <RpgShare className="h-4 w-4" />
                <span>{typeof navigator !== "undefined" && "share" in navigator ? t.share : t.copyLink}</span>
              </RPGButton>

              <RPGButton href="/duel" variant="primary" size="lg" aria-label={t.buildAnother}>
                <RpgSwords className="h-4 w-4" />
                <span>{t.buildAnother}</span>
              </RPGButton>
            </div>

            {shareStatus !== "idle" ? (
              <p
                role="status"
                className={`mt-4 font-mono text-sm ${
                  shareStatus === "error" ? "text-rpg-crimson" : "text-emerald-300"
                }`}
              >
                {shareStatus === "error" ? t.shareFailed : t.copied}
              </p>
            ) : null}
          </RPGPanel>
        </motion.div>
      ) : null}
    </div>
  );
}
