"use client";

import React, { useMemo } from "react";
import { Dialog, RpgClassIcon } from "@/design-system";
import { getTranslation } from "@/i18n";
import { useUiStore } from "@/stores/useUiStore";
import type { ClassExplanation } from "./classExplanation";
import { describeClassExplanation, type ClassMappingView } from "./classExplanationText";

interface ClassExplanationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  explanation: ClassExplanation;
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
export const ClassExplanationDialog: React.FC<ClassExplanationDialogProps> = ({ isOpen, onClose, explanation }) => {
  const { language } = useUiStore();
  const t = getTranslation(language);
  const view = useMemo(() => describeClassExplanation(explanation, language), [explanation, language]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={view.title}
      description={t.classExplanation.subtitle}
      closeLabel={t.common.closeDialog}
    >
      <div className="space-y-5 py-1">
        <Section heading={view.classHeading} className={explanation.className} lines={view.classLines} mapping={view.mapping} />

        {view.subclassHeading && (
          <Section
            heading={view.subclassHeading}
            className={explanation.subclass?.className}
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
