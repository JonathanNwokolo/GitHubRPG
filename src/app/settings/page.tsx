"use client";

import React from "react";
import {
  Card,
  Button,
  Badge,
  PixelSettings,
  PixelVolumeOn,
  PixelVolumeOff,
  PixelEye,
  PixelGlobe,
} from "@/design-system";
import { useUiStore, ReducedMotionOption } from "@/stores/useUiStore";
import { getTranslation } from "@/i18n";
import { playClickSound } from "@/lib/audio/soundEffects";

export default function SettingsPage() {
  const {
    language,
    audioEnabled,
    reducedMotion,
    setLanguage,
    setAudioEnabled,
    setReducedMotion,
  } = useUiStore();
  const t = getTranslation(language);

  const handleAudioChange = (enabled: boolean) => {
    setAudioEnabled(enabled);
    if (enabled) {
      setTimeout(() => playClickSound(), 50);
    }
  };

  const handleMotionChange = (option: ReducedMotionOption) => {
    setReducedMotion(option);
    if (typeof document !== "undefined") {
      const html = document.documentElement;
      if (option === "reduced") {
        html.classList.add("reduced-motion");
      } else {
        html.classList.remove("reduced-motion");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-rpg-border pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="gold">
            <PixelSettings className="w-3.5 h-3.5 mr-1" />
            Preferências do Sistema
          </Badge>
        </div>
        <h1 className="font-pixel text-xl sm:text-2xl text-rpg-gold tracking-wide">
          {t.settings.title}
        </h1>
        <p className="font-sans text-sm text-slate-300 mt-1">
          {t.settings.subtitle}
        </p>
      </div>

      <div className="space-y-6">
        {/* Language setting */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-sans font-bold text-base sm:text-lg text-amber-400 flex items-center gap-2">
                <PixelGlobe className="w-5 h-5 text-amber-400" />
                {t.settings.language}
              </h2>
              <p className="font-sans text-sm text-slate-300 leading-relaxed">
                Selecione o idioma de exibição para todas as legendas, conquistas e atributos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="md"
              variant={language === "pt-BR" ? "primary" : "secondary"}
              onClick={() => setLanguage("pt-BR")}
            >
              Português (pt-BR)
            </Button>
            <Button
              size="md"
              variant={language === "en" ? "primary" : "secondary"}
              onClick={() => setLanguage("en")}
            >
              English (en)
            </Button>
          </div>
        </Card>

        {/* Audio Setting */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-sans font-bold text-base sm:text-lg text-amber-400 flex items-center gap-2">
                {audioEnabled ? (
                  <PixelVolumeOn className="w-5 h-5 text-amber-400" />
                ) : (
                  <PixelVolumeOff className="w-5 h-5 text-slate-400" />
                )}
                {t.settings.soundEffects}
              </h2>
              <p className="font-sans text-sm text-slate-300 leading-relaxed">{t.settings.soundHint}</p>
            </div>
            <Badge variant={audioEnabled ? "legendary" : "common"}>
              {audioEnabled ? t.settings.soundOn : t.settings.soundOff}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="md"
              variant={!audioEnabled ? "primary" : "secondary"}
              onClick={() => handleAudioChange(false)}
            >
              {t.settings.soundOff}
            </Button>
            <Button
              size="md"
              variant={audioEnabled ? "primary" : "secondary"}
              onClick={() => handleAudioChange(true)}
            >
              {t.settings.soundOn}
            </Button>
          </div>
        </Card>

        {/* Reduced Motion Setting */}
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-sans font-bold text-base sm:text-lg text-amber-400 flex items-center gap-2">
                <PixelEye className="w-5 h-5 text-amber-400" />
                {t.settings.motionReduction}
              </h2>
              <p className="font-sans text-sm text-slate-300 leading-relaxed">
                Ajuste a intensidade das transições e animações de acordo com sua sensibilidade visual.
              </p>
            </div>
            <Badge variant="neutral">{reducedMotion}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="sm"
              variant={reducedMotion === "system" ? "primary" : "secondary"}
              onClick={() => handleMotionChange("system")}
            >
              {t.settings.motionSystem}
            </Button>
            <Button
              size="sm"
              variant={reducedMotion === "reduced" ? "primary" : "secondary"}
              onClick={() => handleMotionChange("reduced")}
            >
              {t.settings.motionOn}
            </Button>
            <Button
              size="sm"
              variant={reducedMotion === "standard" ? "primary" : "secondary"}
              onClick={() => handleMotionChange("standard")}
            >
              {t.settings.motionOff}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
