import React from "react";
import { after } from "next/server";
import { notFound } from "next/navigation";
import { ProfileNotFoundError, type GitHubDataSource } from "@/data/datasource";
import { InvalidUsernameError } from "@/data/github/errors";
import { loadCharacterProduct } from "@/data/loadCharacter";
import type { GitHubProfileRequestOptions } from "@/data/contracts";
import { recordInvokedProfile } from "@/data/usage/invokedProfiles";
import CharacterPageClient from "./CharacterPageClient";

interface CharacterSheetProps {
  username: string;
  source: GitHubDataSource;
  requestOptions?: GitHubProfileRequestOptions;
  allowEnrichment?: boolean;
  /** True only for an interactive visitor: the sheet then counts once in the global "summoned profiles" total. */
  countInvocation?: boolean;
}

/** Best effort and off the render path: the counter can fail in any way without touching the sheet. */
function scheduleInvocationCount(username: string): void {
  try {
    after(() => recordInvokedProfile(username));
  } catch {
    /* the counter is decorative: never let it break a sheet */
  }
}

/**
 * The slow part of the route: the whole GitHub fetch + engine run. It renders inside the <Suspense> of
 * page.tsx, so the themed skeleton is on screen while this resolves.
 *
 * Only an unknown profile becomes a 404 here (the normal path is decided earlier, before streaming starts).
 * Anything else (GitHub down, timeout, rate limit, internal error) is rethrown to error.tsx.
 */
export default async function CharacterSheet({ username, source, requestOptions, allowEnrichment = true, countInvocation = false }: CharacterSheetProps) {
  try {
    const { character, chronicle, activityFlame, classExplanation, presentation } = await loadCharacterProduct(username, source, {
      ...(allowEnrichment ? { scheduleBackground: (task: Promise<void>) => after(task) } : {}),
      requestOptions,
    });
    // Reached only for a valid sheet: unknown profiles and failures throw above, before anything is counted.
    if (countInvocation) scheduleInvocationCount(character.identity.username || username);
    return (
      <CharacterPageClient
        character={character}
        chronicle={chronicle}
        activityFlame={activityFlame}
        classExplanation={classExplanation}
        presentation={presentation}
        username={username}
      />
    );
  } catch (error) {
    if (error instanceof ProfileNotFoundError || error instanceof InvalidUsernameError) {
      notFound();
    }
    throw error;
  }
}
