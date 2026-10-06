import type { Metadata } from "next";
import CharacterPageClient from "./CharacterPageClient";

interface CharacterPageProps {
  params: Promise<{ username: string }>;
}

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

export default function CharacterPage(props: CharacterPageProps) {
  return <CharacterPageClient {...props} />;
}
