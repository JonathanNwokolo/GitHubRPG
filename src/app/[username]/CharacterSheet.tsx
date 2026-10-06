import React from "react";
import { notFound } from "next/navigation";
import { ProfileNotFoundError, type GitHubDataSource } from "@/data/datasource";
import { InvalidUsernameError } from "@/data/github/errors";
import { loadCharacterWithChronicle } from "@/data/loadCharacter";
import CharacterPageClient from "./CharacterPageClient";

interface CharacterSheetProps {
  username: string;
  source: GitHubDataSource;
}

/**
 * The slow part of the route: the whole GitHub fetch + engine run. It renders inside the <Suspense> of
 * page.tsx, so the themed skeleton is on screen while this resolves.
 *
 * Only an unknown profile becomes a 404 here (the normal path is decided earlier, before streaming starts).
 * Anything else (GitHub down, timeout, rate limit, internal error) is rethrown to error.tsx.
 */
export default async function CharacterSheet({ username, source }: CharacterSheetProps) {
  try {
    const { character, chronicle, classExplanation } = await loadCharacterWithChronicle(username, source);
    return (
      <CharacterPageClient
        character={character}
        chronicle={chronicle}
        classExplanation={classExplanation}
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
