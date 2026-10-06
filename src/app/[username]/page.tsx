import type { Metadata } from "next";
import React from "react";
import { notFound } from "next/navigation";
import { ProfileNotFoundError, createDataSource } from "@/data/datasource";
import { InvalidUsernameError } from "@/data/github/errors";
import { loadCharacterWithChronicle } from "@/data/loadCharacter";
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

  const cardImageUrl = `/api/card/${encodeURIComponent(safeUsername)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: [
        {
          url: cardImageUrl,
          width: 1200,
          height: 630,
          alt: `Cartão de Herói de @${safeUsername} - GitHub RPG`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cardImageUrl],
    },
  };
}

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { username } = await params;
  const decodedUsername = usernameFromParam(username);

  try {
    const { character, chronicle } = await loadCharacterWithChronicle(decodedUsername, createDataSource());
    return <CharacterPageClient character={character} chronicle={chronicle} username={decodedUsername} />;
  } catch (error) {
    if (error instanceof ProfileNotFoundError || error instanceof InvalidUsernameError) {
      notFound();
    }
    throw error;
  }
}
