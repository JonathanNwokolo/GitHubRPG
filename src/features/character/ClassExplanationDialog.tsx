"use client";

import React, { useMemo } from "react";
import { Dialog, RpgClassIcon } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import type { ClassExplanation } from "./classExplanation";
import { describeClassExplanation, type ClassMappingView } from "./classExplanationText";
import { localizeClassName, localizeClassNamesInText } from "@/i18n/gameContent";
import type { RPGCharacterV2Public } from "@/game-v2/publicProjection";
import { fill } from "@/lib/format";

interface ClassExplanationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  explanation: ClassExplanation;
  v2Explanation?: RPGCharacterV2Public["explanation"] | null;
}

const Mapping: React.FC<{ mapping: ClassMappingView }> = ({ mapping }) => (
  <p className="inline-flex items-center gap-2 px-3 py-1.5 bg-rpg-surface border border-rpg-border font-mono text-xs sm:text-sm text-amber-300">
    <RpgClassIcon classNameType={mapping.className} className="w-4 h-4" />
    <span>{mapping.text}</span>
  </p>
);

const Section: React.FC<{
  heading: string;
  /** The class the section is about; absent when there is none (no subclass). */
  className?: string;
  lines: string[];
  mapping: ClassMappingView | null;
}> = ({ heading, className, lines, mapping }) => (
  <section aria-label={heading} className="space-y-2">
    <h3 className="flex items-center gap-2 font-pixel text-xs text-rpg-gold uppercase tracking-wider">
      <span>{heading}</span>
      {className && (
        <>
          <span aria-hidden="true">·</span>
          <span className="font-sans font-extrabold tracking-wide text-slate-100">{className}</span>
        </>
      )}
    </h3>
    {lines.map((line) => (
      <p key={line} className="font-sans text-sm text-slate-200 leading-relaxed">
        {line}
      </p>
    ))}
    {mapping && <Mapping mapping={mapping} />}
  </section>
);

/**
 * "Why this class?": the language evidence behind the class and subclass the engine assigned.
 * Everything shown comes from the ClassExplanation computed on the server; nothing is re-derived here.
 */
export const ClassExplanationDialog: React.FC<ClassExplanationDialogProps> = ({ isOpen, onClose, explanation, v2Explanation }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);
  const view = useMemo(() => describeClassExplanation(explanation, language), [explanation, language]);
  const localized = language === "pt-BR" ? "pt" : "en";

  if (v2Explanation) {
    return (
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={fill(t.classExplanation.title, { class: localizeClassName(v2Explanation.class.name, language) })}
        description={t.classExplanation.subtitle}
        closeLabel={t.common.closeDialog}
      >
        <div className="space-y-5 py-1">
          <Section heading={t.classExplanation.classHeading} className={localizeClassName(v2Explanation.class.name, language)} lines={[localizeClassNamesInText(v2Explanation.class.reason[localized], language)]} mapping={null} />
          <Section heading={t.classExplanation.specializationHeading} className={v2Explanation.subclass.name?.[localized]} lines={[v2Explanation.subclass.reason[localized]]} mapping={null} />
          <Section heading={t.classExplanation.evolutionHeading} className={v2Explanation.evolution.name?.[localized]} lines={[v2Explanation.evolution.reason[localized]]} mapping={null} />
          <p className="border-t border-rpg-border/60 pt-3 font-sans text-xs italic text-slate-400">{view.disclaimer}</p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={view.title}
      description={t.classExplanation.subtitle}
      closeLabel={t.common.closeDialog}
    >
      <div className="space-y-5 py-1">
        <Section heading={view.classHeading} className={localizeClassName(explanation.className, language)} lines={view.classLines} mapping={view.mapping} />

        {view.subclassHeading && (
          <Section
            heading={view.subclassHeading}
            className={explanation.subclass ? localizeClassName(explanation.subclass.className, language) : undefined}
            lines={view.subclassLines}
            mapping={view.subclassMapping}
          />
        )}

        {view.partialNote && (
          <p role="note" className="font-sans text-xs text-amber-200 border border-amber-700/60 bg-amber-950/30 p-3">
            {view.partialNote}
          </p>
        )}

        <p className="font-sans text-xs text-slate-400 italic border-t border-rpg-border/60 pt-3">{view.disclaimer}</p>
      </div>
    </Dialog>
  );
};
