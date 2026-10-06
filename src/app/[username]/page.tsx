import type { Metadata } from "next";
import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProfileNotFoundError, createDataSource } from "@/data/datasource";
import { InvalidUsernameError } from "@/data/github/errors";
import { buildProfileMetadata } from "@/lib/seo";
import { CharacterLoading } from "./CharacterLoading";
import CharacterSheet from "./CharacterSheet";

interface CharacterPageProps {
  params: Promise<{ username: string }>;
}

export const dynamic = "force-dynamic";

function usernameFromParam(username: string): string {
  try {
    return decodeURIComponent(username);
  } catch {
    return username;
  }
}

export async function generateMetadata({ params }: CharacterPageProps): Promise<Metadata> {
  const { username } = await params;
  return buildProfileMetadata(usernameFromParam(username));
}

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { username } = await params;
  const decodedUsername = usernameFromParam(username);
  const source = createDataSource();

  // 1. Existence, BEFORE anything is streamed: an unknown user must be a real HTTP 404, and a status code cannot
  //    change once the first byte is sent. (This is why the route has no loading.tsx: its boundary would make
  //    Next stream first and answer 200.) The source starts the full fetch during this step and shares it below.
  try {
    await source.ensureProfileExists?.(decodedUsername);
  } catch (error) {
    if (error instanceof ProfileNotFoundError || error instanceof InvalidUsernameError) {
      notFound();
    }
    throw error;
  }

  // 2. The slow part streams behind the themed skeleton. Failures here reach error.tsx.
  return (
    <Suspense fallback={<CharacterLoading />}>
      <CharacterSheet username={decodedUsername} source={source} />
    </Suspense>
  );
}
