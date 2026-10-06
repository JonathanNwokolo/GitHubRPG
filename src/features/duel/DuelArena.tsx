"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Button, ProgressBar, RpgClassIcon, RpgShare, RpgSwords } from "@/design-system";
import { CharacterApiError, fetchCharacter } from "@/data/api/fetchCharacter";
import { FramedAvatar } from "@/features/avatar";
import type { RPGCharacter } from "@/game/types";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import { createDuel } from "./engine";
import type { DuelRound as DuelRoundType, DuelSide } from "./engine";

type LoadState =
  | { status: "loading" }
  | { status: "success"; character: RPGCharacter }
  | { status: "error"; error: unknown };

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

function HeroCard({ character, hp }: { character: RPGCharacter; hp: number }) {
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const name = character.identity.displayName || character.identity.username;
  return (
    <article className="min-w-0 border-2 border-rpg-border bg-rpg-surface p-4 text-center shadow-pixel sm:p-5">
      {/* The name is right below, so the photo itself stays decorative (alt=""), as before. */}
      <FramedAvatar
        username={character.identity.username}
        avatarUrl={character.identity.avatarUrl}
        alt=""
        className="mx-auto h-32 w-32 sm:h-40 sm:w-40"
        priority
        fallback={<span className="font-pixel text-rpg-gold" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>}
      />
      <h2 className="mt-3 break-words font-pixel text-sm leading-relaxed text-slate-50 sm:text-lg">{name}</h2>
      <p className="font-mono text-xs text-slate-400">@{character.identity.username}</p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
        <RpgClassIcon classNameType={character.archetype.className} className="h-4 w-4" />
        {character.archetype.className}{character.archetype.subclassName ? ` / ${character.archetype.subclassName}` : ""}
      </p>
      <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">{t.level} {character.progression.level}</p>
      <div className="mt-4 space-y-2 text-left">
        <ProgressBar value={hp} variant="hp" label={t.hp} size="sm" />
        <ProgressBar value={character.resources.mp} max={character.resources.maxMp} variant="mp" label={t.mp} size="sm" />
      </div>
    </article>
  );
}

function DuelRound({ round, index, usernames }: { round: DuelRoundType; index: number; usernames: Record<DuelSide, string> }) {
  const { language } = useUiStore();
  const t = getTranslation(language).duel;
  const side = (value: DuelSide) => (value === "A" ? round.heroA : round.heroB);
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="border border-rpg-border bg-rpg-surface/90 p-4 shadow-pixel sm:p-6"
      aria-label={`${t.round} ${index + 1}: ${t.rounds[round.id]}`}
    >
      <div className="text-center">
        <p className="font-pixel text-[10px] uppercase tracking-widest text-rpg-crimson">{t.round} {index + 1}</p>
        <h3 className="mt-1 font-pixel text-base uppercase leading-relaxed text-rpg-gold sm:text-xl">{t.rounds[round.id]}</h3>
        <p className="mt-2 text-sm text-slate-300">{t.narratives[round.id]}</p>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center sm:gap-8">
        {(["A", "B"] as const).map((heroSide, listIndex) => {
          const hero = side(heroSide);
          return (
            <React.Fragment key={heroSide}>
              {listIndex === 1 ? <span className="font-pixel text-sm text-rpg-crimson">VS</span> : null}
              <div className={listIndex === 1 ? "col-start-3" : ""}>
                <p className="truncate font-mono text-xs text-slate-400">@{usernames[heroSide]}</p>
                <p className="my-2 font-pixel text-2xl text-slate-50 sm:text-4xl">{Math.round(hero.power)}</p>
                <p className="break-words text-xs font-bold text-amber-300">{roundHighlight(hero, t)}</p>
                <p className="mt-1 text-[11px] text-slate-500">{t.basePower.replace("{value}", String(Math.round(hero.basePower)))}</p>
                {hero.modifier ? (
                  <p className="mt-2 text-[11px] text-purple-300">
                    {t.abilities[hero.modifier.abilityKey]} · {t.classBonus.replace("{value}", String(hero.modifier.amount))}
                  </p>
                ) : null}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <p className="mt-5 border-t border-rpg-border/70 pt-3 text-center text-sm font-bold text-rpg-gold">
        {round.winner === "draw" ? t.roundDraw : t.roundWinner.replace("{username}", usernames[round.winner])}
      </p>
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
    return <div role="status" className="animate-pulse border border-rpg-border bg-rpg-surface p-6 text-center text-slate-300">{t.loadingHero.replace("{username}", username)}</div>;
  }
  if (state.status === "error") {
    return <div role="alert" className="border border-rpg-crimson bg-red-950/30 p-6 text-center text-slate-200"><p>{errorMessage(state.error, username, t)}</p><Button className="mt-4" size="sm" onClick={retry}>{t.retry}</Button></div>;
  }
  return null;
}

export function DuelArena({ heroA, heroB }: { heroA: string; heroB: string }) {
  const { language, reducedMotion } = useUiStore();
  const t = getTranslation(language).duel;
  const systemReduced = useReducedMotion();
  const shouldReduce = reducedMotion === "reduced" || (reducedMotion === "system" && systemReduced);
  const [stateA, setStateA] = useState<LoadState>({ status: "loading" });
  const [stateB, setStateB] = useState<LoadState>({ status: "loading" });
  const [visibleRounds, setVisibleRounds] = useState(0);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");

  const load = useCallback((side: DuelSide) => {
    const username = side === "A" ? heroA : heroB;
    const setState = side === "A" ? setStateA : setStateB;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchCharacter(username, controller.signal).then(
      (character) => setState({ status: "success", character }),
      (error) => { if (!controller.signal.aborted) setState({ status: "error", error }); }
    );
    return () => controller.abort();
  }, [heroA, heroB]);

  useEffect(() => {
    const abortA = load("A");
    const abortB = load("B");
    return () => { abortA(); abortB(); };
  }, [load]);

  const duel = useMemo(
    () => stateA.status === "success" && stateB.status === "success" ? createDuel(stateA.character, stateB.character) : null,
    [stateA, stateB]
  );

  useEffect(() => {
    if (!duel) { setVisibleRounds(0); return; }
    if (shouldReduce) { setVisibleRounds(duel.rounds.length); return; }
    setVisibleRounds(0);
    const timers = duel.rounds.map((_, index) => window.setTimeout(() => setVisibleRounds(index + 1), 500 + index * 1800));
    return () => timers.forEach(window.clearTimeout);
  }, [duel, shouldReduce]);

  const finalVisible = Boolean(duel && visibleRounds >= duel.rounds.length);
  const hpA = duel && visibleRounds > 0 ? duel.rounds[Math.min(visibleRounds, duel.rounds.length) - 1].heroA.hpAfter : 100;
  const hpB = duel && visibleRounds > 0 ? duel.rounds[Math.min(visibleRounds, duel.rounds.length) - 1].heroB.hpAfter : 100;

  const share = async () => {
    const data = { title: t.shareTitle.replace("{heroA}", heroA).replace("{heroB}", heroB), text: t.shareText.replace("{heroA}", heroA).replace("{heroB}", heroB), url: window.location.href };
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stateA.status === "success" ? <HeroCard character={stateA.character} hp={100} /> : <LoadingOrError state={stateA} username={heroA} retry={() => load("A")} />}
          {stateB.status === "success" ? <HeroCard character={stateB.character} hp={100} /> : <LoadingOrError state={stateB} username={heroB} retry={() => load("B")} />}
        </div>
      </div>
    );
  }

  if (!duel) return null;
  const usernames = { A: stateA.character.identity.username, B: stateB.character.identity.username };
  const winner = duel.winner === "draw" ? null : usernames[duel.winner];

  return (
    <div className="mx-auto max-w-5xl space-y-6 overflow-x-hidden">
      <header className="text-center">
        <RpgSwords className="mx-auto h-9 w-9 text-rpg-crimson" />
        <h1 className="mt-2 font-pixel text-xl uppercase leading-relaxed text-rpg-gold sm:text-3xl">{t.title}</h1>
      </header>
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <HeroCard character={stateA.character} hp={hpA} />
        <div className="text-center font-pixel text-2xl text-rpg-crimson" aria-hidden="true">VS</div>
        <HeroCard character={stateB.character} hp={hpB} />
      </div>

      {!finalVisible ? <div className="text-center"><Button variant="secondary" size="sm" onClick={() => setVisibleRounds(duel.rounds.length)}>{t.skipAnimation}</Button></div> : null}

      <div className="space-y-4" aria-live="polite" aria-atomic="false">
        {duel.rounds.slice(0, visibleRounds).map((round, index) => <DuelRound key={round.id} round={round} index={index} usernames={usernames} />)}
      </div>

      {finalVisible ? (
        <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="border-2 border-rpg-goldDark bg-gradient-to-br from-rpg-surfaceLight to-rpg-obsidian p-6 text-center shadow-pixel-gold sm:p-8" aria-labelledby="duel-result-title">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.result}</p>
          <h2 id="duel-result-title" className="mt-3 font-pixel text-lg uppercase leading-relaxed text-rpg-gold sm:text-2xl">{winner ? t.won.replace("{username}", winner) : t.legendaryDraw}</h2>
          <p className="mt-4 font-pixel text-3xl text-slate-50">{duel.scoreA} <span className="text-rpg-crimson">⚔</span> {duel.scoreB}</p>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-300">{t.disclaimer}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={share}><RpgShare className="h-4 w-4" /> {typeof navigator !== "undefined" && "share" in navigator ? t.share : t.copyLink}</Button>
            <Link href="/duel" className="inline-flex min-h-[44px] items-center justify-center border-2 border-rpg-border bg-rpg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-100 shadow-pixel hover:border-rpg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rpg-gold">{t.buildAnother}</Link>
          </div>
          {shareStatus !== "idle" ? <p role="status" className={`mt-3 text-sm ${shareStatus === "error" ? "text-rpg-crimson" : "text-emerald-300"}`}>{shareStatus === "error" ? t.shareFailed : t.copied}</p> : null}
        </motion.section>
      ) : null}
    </div>
  );
}

