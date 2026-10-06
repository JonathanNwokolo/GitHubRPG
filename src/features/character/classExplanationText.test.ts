import { describe, expect, it } from "vitest";
import { determineArchetype } from "@/game/engine";
import { analysisFromShares } from "@/test/builders";
import { buildClassExplanation } from "./classExplanation";
import { describeClassExplanation } from "./classExplanationText";

function view(
  shares: Record<string, number>,
  language: "pt-BR" | "en",
  coverage: "full" | "partial" | "unavailable" = "full"
) {
  const analysis = analysisFromShares(shares);
  return describeClassExplanation(buildClassExplanation(determineArchetype(analysis), analysis, coverage), language);
}

describe("class explanation text (pt-BR)", () => {
  it("class + subclass: names the language, its share and the mapping", () => {
    const v = view({ TypeScript: 59.6, HTML: 25.8, Python: 14.6 }, "pt-BR");

    expect(v.title).toBe("Por que Mago?");
    expect(v.classLines).toEqual([
      "Sua linguagem principal é TypeScript.",
      "TypeScript representa 59,6% dos bytes de linguagem analisados.",
    ]);
    expect(v.mapping?.text).toBe("No GitHub RPG: TypeScript → Mago");
    expect(v.subclassHeading).toBe("Subclasse");
    expect(v.subclassLines).toEqual([
      "HTML é sua próxima afinidade elegível.",
      "Participação: 25,8% dos bytes (25,8% entre as linguagens relevantes).",
      "A subclasse exige que a linguagem tenha ao menos 10% do uso entre as linguagens relevantes (as que têm 5% ou mais dos bytes).",
    ]);
    expect(v.subclassMapping?.text).toBe("No GitHub RPG: HTML → Bardo");
  });

  it("never presents the class as a professional assessment", () => {
    const v = view({ TypeScript: 100 }, "pt-BR");
    expect(v.disclaimer).toBe(
      "A classe representa o padrão das linguagens públicas detectadas no seu GitHub. Não mede habilidade profissional."
    );
  });

  it("same class: says the language was weighed and why it did not count", () => {
    const v = view({ TypeScript: 70, JavaScript: 30 }, "pt-BR");

    expect(v.subclassLines).toEqual([
      "JavaScript (30%) também aponta para Mago, então não gera subclasse.",
      "As outras linguagens relevantes apontam para a mesma classe ou para nenhuma, então não há subclasse.",
    ]);
    expect(v.subclassMapping).toBeNull();
  });

  it("threshold: shows the near miss against the engine's 10%", () => {
    const v = view({ TypeScript: 88, HTML: 6, Python: 6 }, "pt-BR");

    expect(v.subclassLines).toEqual(["HTML (Bardo) tem 6% do uso relevante, abaixo dos 10% exigidos para uma subclasse."]);
  });

  it("only one relevant language", () => {
    const v = view({ TypeScript: 100 }, "pt-BR");
    expect(v.subclassLines).toEqual(["Não há outra linguagem relevante (5% ou mais dos bytes), então não há subclasse."]);
  });

  it("Aventureiro by an unmapped language", () => {
    const v = view({ Lua: 100 }, "pt-BR");

    expect(v.title).toBe("Por que Aventureiro?");
    expect(v.classLines[0]).toBe(
      "Sua linguagem principal é Lua, que ainda não tem uma classe própria no GitHub RPG. Por isso você é Aventureiro."
    );
    expect(v.mapping).toBeNull();
  });

  it("no languages and unavailable languages say what happened, with no subclass section", () => {
    const empty = view({}, "pt-BR");
    expect(empty.classLines).toEqual([
      "Nenhuma linguagem foi encontrada nos seus repositórios próprios (forks não contam). Por isso você é Aventureiro, por enquanto.",
    ]);
    expect(empty.subclassHeading).toBeNull();

    const unavailable = view({}, "pt-BR", "unavailable");
    expect(unavailable.classLines).toEqual([
      "Não foi possível ler as linguagens deste perfil agora. Por isso você é Aventureiro, por enquanto.",
    ]);
    expect(unavailable.subclassHeading).toBeNull();
  });

  it("partial coverage warns that the percentages are approximate; full coverage does not", () => {
    expect(view({ TypeScript: 100 }, "pt-BR", "partial").partialNote).toBe(
      "Dados parciais: nem todos os repositórios puderam ser analisados, então as porcentagens são aproximadas."
    );
    expect(view({ TypeScript: 100 }, "pt-BR", "full").partialNote).toBeNull();
  });
});

describe("class explanation text (en)", () => {
  it("class + subclass, with English number formatting", () => {
    const v = view({ TypeScript: 59.6, HTML: 25.8, Python: 14.6 }, "en");

    expect(v.title).toBe("Why Mago?");
    expect(v.classLines).toEqual([
      "Your main language is TypeScript.",
      "TypeScript makes up 59.6% of the language bytes analysed.",
    ]);
    expect(v.mapping?.text).toBe("In GitHub RPG: TypeScript → Mago");
    expect(v.subclassLines[0]).toBe("HTML is your next eligible affinity.");
    expect(v.subclassMapping?.text).toBe("In GitHub RPG: HTML → Bardo");
    expect(v.disclaimer).toContain("does not measure professional skill");
  });

  it("every state has English text (no Portuguese leaks into the sentences)", () => {
    const states = [
      view({ TypeScript: 100 }, "en"),
      view({ TypeScript: 70, JavaScript: 30 }, "en"),
      view({ TypeScript: 88, HTML: 6, Python: 6 }, "en"),
      view({ Lua: 100 }, "en"),
      view({}, "en"),
      view({}, "en", "unavailable"),
      view({ TypeScript: 100 }, "en", "partial"),
    ];
    const text = states.flatMap((v) => [...v.classLines, ...v.subclassLines, v.partialNote ?? "", v.disclaimer]).join(" ");

    expect(text).not.toMatch(/linguagem|subclasse|repositórios|Dados parciais|Por isso/i);
  });
});
