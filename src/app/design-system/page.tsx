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
  RpgIconFrame,
  RpgClassIcon,
  RpgShield,
  RpgSword,
  RpgHeart,
  RpgMana,
  RpgZap,
  RpgTome,
  RpgStar,
  RpgLayers,
  RpgCalendar,
  RpgCrown,
  RpgTrophy,
  RpgLock,
  RpgUnlock,
  RpgSearch,
  RpgSparkles,
  RpgCompass,
  RpgGhost,
  type IconRarity,
} from "@/design-system";
import type { ClassName } from "@/game/types";

export default function DesignSystemPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tab-icons");
  const [progressVal, setProgressVal] = useState(65);

  const tabItems = [
    { id: "tab-icons", label: "RPG Icon System" },
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

      {/* Panel: RPG Icon System */}
      {activeTab === "tab-icons" && (
        <div className="space-y-12 animate-fade-in">
          {/* 1. Atributos Principais */}
          <section className="space-y-4">
            <div className="border-b border-rpg-border pb-2">
              <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase flex items-center gap-2">
                <RpgIconFrame size="sm" shape="hex" rarity="gold" glow>
                  <RpgZap className="w-4 h-4" />
                </RpgIconFrame>
                Atributos Principais (Hex Crest Medallions)
              </h2>
              <p className="font-sans text-xs text-slate-400 mt-1">
                Ícones geométricos com bisel 3D e iluminação zenital de 45°, engastados em medalhões hexagonais.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="p-4 flex flex-col items-center text-center gap-2.5">
                <RpgIconFrame size="lg" shape="hex" rarity="gold" glow>
                  <RpgZap className="w-7 h-7" />
                </RpgIconFrame>
                <span className="font-sans font-bold text-sm text-amber-400">Activity</span>
                <span className="text-[11px] text-slate-400">Raio de Mjolnir &bull; Commits</span>
              </Card>

              <Card className="p-4 flex flex-col items-center text-center gap-2.5">
                <RpgIconFrame size="lg" shape="hex" rarity="arcane" glow>
                  <RpgTome className="w-7 h-7" />
                </RpgIconFrame>
                <span className="font-sans font-bold text-sm text-purple-400">Experience</span>
                <span className="text-[11px] text-slate-400">Tomo Rúnico &bull; Idade & Repos</span>
              </Card>

              <Card className="p-4 flex flex-col items-center text-center gap-2.5">
                <RpgIconFrame size="lg" shape="hex" rarity="legendary" glow>
                  <RpgStar className="w-7 h-7" />
                </RpgIconFrame>
                <span className="font-sans font-bold text-sm text-yellow-300">Reputation</span>
                <span className="text-[11px] text-slate-400">Estrela Diamante &bull; Stars</span>
              </Card>

              <Card className="p-4 flex flex-col items-center text-center gap-2.5">
                <RpgIconFrame size="lg" shape="hex" rarity="azure" glow>
                  <RpgLayers className="w-7 h-7" />
                </RpgIconFrame>
                <span className="font-sans font-bold text-sm text-cyan-400">Versatility</span>
                <span className="text-[11px] text-slate-400">Prismas &bull; Variedade Stack</span>
              </Card>

              <Card className="p-4 flex flex-col items-center text-center gap-2.5">
                <RpgIconFrame size="lg" shape="hex" rarity="emerald" glow>
                  <RpgCalendar className="w-7 h-7" />
                </RpgIconFrame>
                <span className="font-sans font-bold text-sm text-emerald-400">Consistency</span>
                <span className="text-[11px] text-slate-400">Ampulheta de Ferro &bull; Streaks</span>
              </Card>
            </div>
          </section>

          {/* 2. As 12 Classes de Personagem */}
          <section className="space-y-4">
            <div className="border-b border-rpg-border pb-2">
              <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase flex items-center gap-2">
                <RpgIconFrame size="sm" shape="shield" rarity="arcane" glow>
                  <RpgShield className="w-4 h-4" />
                </RpgIconFrame>
                As 12 Classes do Personagem (Insignias & Metáforas)
              </h2>
              <p className="font-sans text-xs text-slate-400 mt-1">
                Brasões heráldicos autorais que unem arquétipos de RPG de fantasia sombria às ferramentas e ecossistemas de código.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {(
                [
                  { name: "Mago", lang: "JS / TypeScript", desc: "Cajado com chaves { }", rarity: "arcane" },
                  { name: "Alquimista", lang: "Python", desc: "Frasco com Ouroboros", rarity: "emerald" },
                  { name: "Guerreiro", lang: "Rust / C / C++", desc: "Espada com guarda de engrenagem", rarity: "crimson" },
                  { name: "Patrulheiro", lang: "Go", desc: "Arco & canais paralelos", rarity: "azure" },
                  { name: "Paladino", lang: "Java / C#", desc: "Escudo torre com cruz estrita", rarity: "rare" },
                  { name: "Bardo", lang: "HTML / CSS", desc: "Alaúde dos prismas visuais", rarity: "legendary" },
                  { name: "Ladino", lang: "Shell / PowerShell", desc: "Adaga com prompt >_", rarity: "common" },
                  { name: "Oráculo", lang: "Ruby", desc: "Espelho com rubi facetado", rarity: "crimson" },
                  { name: "Escriba", lang: "PHP", desc: "Pena de ferro & tinteiro", rarity: "gold" },
                  { name: "Sentinela", lang: "Kotlin / Swift", desc: "Elmo com visor widescreen", rarity: "azure" },
                  { name: "Tecelão", lang: "Dart / Flutter", desc: "Lançadeira de tear e fios", rarity: "arcane" },
                  { name: "Aventureiro", lang: "Poliglota / Geral", desc: "Bússola rúnica & adaga", rarity: "gold" },
                ] as Array<{ name: ClassName; lang: string; desc: string; rarity: IconRarity }>
              ).map((cls) => (
                <Card key={cls.name} className="p-4 flex items-center gap-3">
                  <RpgIconFrame size="lg" shape="shield" rarity={cls.rarity} glow>
                    <RpgClassIcon classNameType={cls.name} className="w-6 h-6" />
                  </RpgIconFrame>
                  <div className="space-y-0.5">
                    <p className="font-sans font-bold text-sm text-slate-100">{cls.name}</p>
                    <p className="font-mono text-[11px] text-amber-400 font-medium">{cls.lang}</p>
                    <p className="text-[10px] text-slate-400">{cls.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* 3. Formatos de Medalhão e Escalas */}
          <section className="space-y-4">
            <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase border-b border-rpg-border pb-2">
              Containers Heráldicos & Escalas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 space-y-4">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wide">
                  Formatos de Medalhão
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <RpgIconFrame size="lg" shape="hex" rarity="gold" glow>
                      <RpgZap className="w-6 h-6" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">Hex (Stats)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <RpgIconFrame size="lg" shape="shield" rarity="arcane" glow>
                      <RpgShield className="w-6 h-6" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">Shield (Classes)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <RpgIconFrame size="lg" shape="slate" rarity="azure" glow>
                      <RpgTome className="w-6 h-6" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">Slate (Skills)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <RpgIconFrame size="lg" shape="circle" rarity="legendary" glow>
                      <RpgCrown className="w-6 h-6" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">Circle (Prestige)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <RpgIconFrame size="lg" shape="none">
                      <RpgSword className="w-7 h-7 text-amber-400" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">None (Inline)</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wide">
                  Escalas Óticas (XS até XL)
                </h3>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <RpgIconFrame size="xs" shape="slate" rarity="gold">
                      <RpgStar className="w-3.5 h-3.5" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">XS (16px)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <RpgIconFrame size="sm" shape="slate" rarity="gold">
                      <RpgStar className="w-4 h-4" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">SM (20px)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <RpgIconFrame size="md" shape="slate" rarity="gold">
                      <RpgStar className="w-5 h-5" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">MD (24px)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <RpgIconFrame size="lg" shape="slate" rarity="gold">
                      <RpgStar className="w-7 h-7" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">LG (32px)</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <RpgIconFrame size="xl" shape="slate" rarity="gold" glow>
                      <RpgStar className="w-10 h-10" />
                    </RpgIconFrame>
                    <span className="text-[10px] text-slate-400 font-mono">XL (48px)</span>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* 4. Glifos de HUD e Progressão */}
          <section className="space-y-4">
            <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase border-b border-rpg-border pb-2">
              Glifos de HUD, Progressão e Navegação
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { name: "HP Heart", icon: <RpgHeart className="w-5 h-5 text-red-400" />, desc: "Vida do Projeto" },
                { name: "MP Mana", icon: <RpgMana className="w-5 h-5 text-cyan-400" />, desc: "Mana Criativa" },
                { name: "Crown", icon: <RpgCrown className="w-5 h-5 text-amber-400" />, desc: "Títulos & Honra" },
                { name: "Trophy", icon: <RpgTrophy className="w-5 h-5 text-yellow-300" />, desc: "Conquistas" },
                { name: "Unlocked", icon: <RpgUnlock className="w-5 h-5 text-emerald-400" />, desc: "Desbloqueado" },
                { name: "Locked", icon: <RpgLock className="w-5 h-5 text-slate-400" />, desc: "Trancado" },
                { name: "Scrying Orb", icon: <RpgSearch className="w-5 h-5 text-sky-400" />, desc: "Busca Rúnica" },
                { name: "Sparkles", icon: <RpgSparkles className="w-5 h-5 text-purple-400" />, desc: "Magia Arcana" },
                { name: "Compass", icon: <RpgCompass className="w-5 h-5 text-amber-300" />, desc: "Exploração" },
                { name: "Soul Shade", icon: <RpgGhost className="w-5 h-5 text-purple-300" />, desc: "404 / Sem Dados" },
                { name: "Swords", icon: <RpgSword className="w-5 h-5 text-amber-400" />, desc: "Lâmina Rúnica" },
                { name: "Shield", icon: <RpgShield className="w-5 h-5 text-amber-400" />, desc: "Escudo Heráldico" },
              ].map((item) => (
                <Card key={item.name} className="p-3 flex flex-col items-center text-center gap-1.5">
                  <div className="p-2 bg-rpg-surfaceLight/60 border border-rpg-border flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="font-sans font-bold text-xs text-slate-200 mt-1">{item.name}</span>
                  <span className="text-[10px] text-slate-400">{item.desc}</span>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Panel 1: Buttons & Badges */}
      {activeTab === "tab-buttons" && (
        <div className="space-y-10 animate-fade-in">
          {/* Buttons Section */}
          <section className="space-y-4">
            <h2 className="font-sans font-bold text-base sm:text-lg text-slate-100 uppercase border-b border-rpg-border pb-2 flex items-center gap-2">
              <RpgSword className="w-5 h-5 text-amber-400" />
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
              <RpgSparkles className="w-5 h-5 text-purple-400" />
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
                  leftIcon={<RpgSearch className="w-4 h-4" />}
                />

                <Input
                  label="Input com Erro de Validação"
                  defaultValue="usuario-invalido"
                  error="Aventureiro não foi encontrado nos reinos do código (404)."
                  leftIcon={<RpgSearch className="w-4 h-4" />}
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
              <RpgHeart className="w-5 h-5 text-red-400" />
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
                  icon={<RpgCompass className="w-6 h-6 text-amber-400" />}
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
                <RpgShield className="w-8 h-8 text-amber-400 animate-bounce flex-shrink-0" />
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
