"use client";

import React, { useState } from "react";
import {
  Button,
  Badge,
  Card,
  Input,
  ProgressBar,
  Dialog,
  Tabs,
  Tooltip,
  LoadingState,
  ErrorState,
  EmptyState,
  PixelSparkles,
  PixelShield,
  PixelSword,
  PixelHeart,
  PixelCompass,
  PixelSearch,
} from "@/design-system";

export default function DesignSystemPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tab-buttons");
  const [progressVal, setProgressVal] = useState(65);

  const tabItems = [
    { id: "tab-buttons", label: "Buttons & Badges" },
    { id: "tab-inputs", label: "Inputs & Cards" },
    { id: "tab-progress", label: "Progress & Bars" },
    { id: "tab-dialogs", label: "Modals & States" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 w-full space-y-12">
      {/* Header */}
      <div className="border-b-2 border-rpg-border pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="gold">Design System</Badge>
          <Badge variant="legendary">Dark Fantasy &bull; Pixel Modern</Badge>
        </div>
        <h1 className="font-pixel text-xl sm:text-2xl text-rpg-gold tracking-wide">
          Catálogo de Componentes do GitHub RPG
        </h1>
        <p className="font-sans text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          Biblioteca de componentes autorais construídos sem frameworks pesados, com foco em acessibilidade
          (WCAG AA), navegação por teclado, alto contraste e estética de fantasia sombria.
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Panel 1: Buttons & Badges */}
      {activeTab === "tab-buttons" && (
        <div className="space-y-10 animate-fade-in">
          {/* Buttons Section */}
          <section className="space-y-4">
            <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase border-b border-rpg-border pb-2 flex items-center gap-2">
              <PixelSword className="w-5 h-5 text-amber-400" />
              Botões e Estados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="space-y-3 p-5">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wide">Variantes</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary">Primary (Gold)</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="arcane">Arcane</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
              </Card>

              <Card className="space-y-3 p-5">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wide">Tamanhos</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </Card>

              <Card className="space-y-3 p-5">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wide">Estados (Loading & Disabled)</h3>
                <div className="flex flex-wrap gap-2">
                  <Button isLoading>Invocando...</Button>
                  <Button disabled>Desabilitado</Button>
                  <Tooltip content="Tooltip revelado no hover ou foco!">
                    <Button variant="secondary">Com Tooltip</Button>
                  </Tooltip>
                </div>
              </Card>
            </div>
          </section>

          {/* Badges & Rarities Section */}
          <section className="space-y-4">
            <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase border-b border-rpg-border pb-2 flex items-center gap-2">
              <PixelSparkles className="w-5 h-5 text-purple-400" />
              Badges e Raridades
            </h2>
            <Card className="space-y-4 p-5 sm:p-6">
              <div>
                <p className="font-sans text-xs text-slate-300 font-semibold mb-2">Raridades de Itens e Conquistas:</p>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="common">Comum (Common)</Badge>
                  <Badge variant="rare">Raro (Rare)</Badge>
                  <Badge variant="epic">Épico (Epic)</Badge>
                  <Badge variant="legendary">Lendário (Legendary)</Badge>
                </div>
              </div>

              <div className="pt-2 border-t border-rpg-border">
                <p className="font-sans text-xs text-slate-300 font-semibold mb-2">Afinidades Elementais & Status:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="gold">Ouro &bull; 1.250</Badge>
                  <Badge variant="arcane">Arcano &bull; Mago</Badge>
                  <Badge variant="crimson">Fogo &bull; Alerta</Badge>
                  <Badge variant="azure">Mana &bull; 450 MP</Badge>
                  <Badge variant="emerald">Vital &bull; Saudável</Badge>
                  <Badge variant="neutral">Neutro</Badge>
                </div>
              </div>
            </Card>
          </section>
        </div>
      )}

      {/* Panel 2: Inputs & Cards */}
      {activeTab === "tab-inputs" && (
        <div className="space-y-10 animate-fade-in">
          <section className="space-y-4">
            <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase border-b border-rpg-border pb-2">
              Inputs e Estados de Validação
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="space-y-4 p-5 sm:p-6">
                <Input
                  label="Nome de Usuário"
                  placeholder="ex: rookie-dev"
                  helperText="Digite um usuário para invocar a ficha rúnica."
                  leftIcon={<PixelSearch className="w-4 h-4" />}
                />

                <Input
                  label="Input com Erro de Validação"
                  defaultValue="usuario-invalido"
                  error="Aventureiro não foi encontrado nos reinos do código (404)."
                  leftIcon={<PixelSearch className="w-4 h-4" />}
                />

                <Input
                  label="Input Desabilitado"
                  defaultValue="campo-trancado"
                  disabled
                  helperText="Este campo foi encantado contra edições."
                />
              </Card>

              <Card className="space-y-4 p-5 sm:p-6">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wide">Variantes de Cards</h3>
                <div className="space-y-3">
                  <Card variant="default">
                    <p className="font-sans font-bold text-sm text-amber-400">Card Default</p>
                    <p className="text-xs text-slate-300">Borda padrão com cantos de pixel e sombra plana.</p>
                  </Card>

                  <Card variant="interactive">
                    <p className="font-sans font-bold text-sm text-purple-300">Card Interativo (Passe o mouse)</p>
                    <p className="text-xs text-slate-300">Elevação sutil no hover e cursor em ponteiro.</p>
                  </Card>

                  <Card variant="rune" rarity="legendary">
                    <p className="font-sans font-bold text-sm text-amber-300">Card de Runicidade Lendária</p>
                    <p className="text-xs text-slate-300">Borda dourada de raridade com fundo degradê.</p>
                  </Card>
                </div>
              </Card>
            </div>
          </section>
        </div>
      )}

      {/* Panel 3: Progress Bars */}
      {activeTab === "tab-progress" && (
        <div className="space-y-10 animate-fade-in">
          <section className="space-y-4">
            <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase border-b border-rpg-border pb-2 flex items-center gap-2">
              <PixelHeart className="w-5 h-5 text-red-400" />
              Barras de Progresso e Recursos
            </h2>

            <Card className="space-y-6 p-5 sm:p-6">
              <div className="space-y-2">
                <ProgressBar
                  variant="xp"
                  value={progressVal}
                  max={100}
                  label="Experiência (XP do Nível)"
                  valueFormatter={(v) => `${v}% até o Nível 49`}
                />
              </div>

              <div className="space-y-2">
                <ProgressBar
                  variant="hp"
                  value={480}
                  max={580}
                  label="Pontos de Vida (HP do Projeto)"
                  valueFormatter={(v, m) => `${v} / ${m} HP`}
                />
              </div>

              <div className="space-y-2">
                <ProgressBar
                  variant="mp"
                  value={230}
                  max={300}
                  label="Mana Criativa (MP Arcano)"
                  valueFormatter={(v, m) => `${v} / ${m} MP`}
                />
              </div>

              <div className="space-y-2">
                <ProgressBar
                  variant="stat"
                  value={85}
                  max={100}
                  label="Atributo: Consistência Técnica"
                  valueFormatter={(v) => `${v} / 100`}
                />
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-rpg-border">
                <Button size="sm" onClick={() => setProgressVal((p) => Math.max(0, p - 15))}>
                  -15% XP
                </Button>
                <Button size="sm" onClick={() => setProgressVal((p) => Math.min(100, p + 15))}>
                  +15% XP
                </Button>
              </div>
            </Card>
          </section>
        </div>
      )}

      {/* Panel 4: Modals & States */}
      {activeTab === "tab-dialogs" && (
        <div className="space-y-10 animate-fade-in">
          <section className="space-y-4">
            <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase border-b border-rpg-border pb-2">
              Estados do Sistema (Loading, Error & Empty)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-5">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wide mb-3">Loading State</h3>
                <LoadingState message="Decifrando runas..." />
              </Card>

              <Card className="p-5">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wide mb-3">Error State</h3>
                <ErrorState
                  title="Falta de Conexão"
                  message="O oráculo não respondeu à invocação cósmica."
                  onRetry={() => {}}
                />
              </Card>

              <Card className="p-5">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wide mb-3">Empty State</h3>
                <EmptyState
                  title="Sem Registros"
                  message="Este herói não possui registros ativos no momento."
                  icon={<PixelCompass className="w-6 h-6 text-amber-400" />}
                />
              </Card>
            </div>

            <div className="pt-6">
              <Card className="flex flex-col items-start gap-4 p-5 sm:p-6">
                <div>
                  <h3 className="font-sans font-bold text-base text-amber-400">Diálogo / Modal com Armadilha de Foco</h3>
                  <p className="font-sans text-xs sm:text-sm text-slate-300 mt-1">
                    Suporta fechamento por tecla ESC, clique no backdrop e retenção de foco.
                  </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>Abrir Modal de Demonstração</Button>
              </Card>
            </div>
          </section>

          <Dialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            title="Conquista Desbloqueada!"
            description="Você inspecionou as fundações do Design System."
          >
            <div className="space-y-4 py-2">
              <div className="p-4 bg-rpg-surface border border-rpg-gold flex items-center gap-3">
                <PixelShield className="w-8 h-8 text-amber-400 animate-bounce flex-shrink-0" />
                <div>
                  <p className="font-sans font-bold text-sm text-amber-400">Arquiteto de Componentes</p>
                  <p className="font-sans text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Navegou com êxito por todos os nós do design system dark fantasy.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsDialogOpen(false)}>
                  Fechar
                </Button>
                <Button variant="primary" size="sm" onClick={() => setIsDialogOpen(false)}>
                  Coletar Ouro
                </Button>
              </div>
            </div>
          </Dialog>
        </div>
      )}
    </div>
  );
}
