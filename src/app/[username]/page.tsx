import type { Metadata } from "next";
import React from "react";
import { notFound } from "next/navigation";
import { ProfileNotFoundError, createDataSource } from "@/data/datasource";
import { InvalidUsernameError } from "@/data/github/errors";
import { loadCharacter } from "@/data/loadCharacter";
import CharacterPageClient from "./CharacterPageClient";

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
  const decodedUsername = usernameFromParam(username);
  const safeUsername = decodedUsername.trim() || "perfil";
  const title = `@${safeUsername} | GitHub RPG`;
  const description = `Ficha RPG de @${safeUsername} gerada a partir de dados publicos do GitHub.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { username } = await params;
  const decodedUsername = usernameFromParam(username);

  try {
    const character = await loadCharacter(decodedUsername, createDataSource());
    return <CharacterPageClient character={character} username={decodedUsername} />;
  } catch (error) {
    if (error instanceof ProfileNotFoundError || error instanceof InvalidUsernameError) {
      notFound();
    }
    throw error;
  }
}
