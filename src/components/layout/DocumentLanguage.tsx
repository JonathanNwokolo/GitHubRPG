"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/useUiStore";

/**
 * Keeps `<html lang>` in step with the interface language. The server renders the default
 * (pt-BR); after hydration this effect updates the attribute, so there is no hydration mismatch.
 * Renders nothing.
 */
export function DocumentLanguage() {
  const language = useUiStore((state) => state.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}
