import type { PracticeArchetype } from "./types";

export const ENGINE_VERSION = "2.0-experimental-v24-evo" as const;
export const RULES_VERSION = "game-engine-v2-experimental" as const;
export const SCHEMA_VERSION = "game-engine-v2-schema-2" as const;
export const DETECTOR_VERSION = "game-engine-v2-detectors-3-collector-v21" as const;
export const CATALOG_VERSION = "game-engine-v2-catalog-1" as const;
export const BALANCE_VERSION = "game-engine-v2-balance-v24-evolution-confidence" as const;
export const CACHE_NAMESPACE = "v2-experimental" as const;

export const V2_BALANCE = Object.freeze({
  maxRepositories: 30,
  maxManifestRequests: 90,
  maxManifestsPerRepository: 10,
  maxManifestsPerProfile: 180,
  treeConcurrency: 6,
  manifestBatchSize: 30,
  collectorTimeoutMs: 10_000,
  maxFileBytes: 256_000,
  affinityRepoSaturation: 8,
  subclassStrong: 55,
  subclassPossible: 42,
  subclassMargin: 5,
  immatureDays: 90,
  immatureRepos: 2,
  grimoireSchoolMin: 25,
  grimoireArtifactMin: 25,
  grimoireAffinityLimit: 8,
  grimoireSchoolLimit: 5,
  grimoireArtifactLimit: 8,
  toolingArchetypeCap: 40,
  genericSignalCap: 42,
});

export const ARCHETYPE_ORDER: readonly PracticeArchetype[] = [
  "architect", "artificer", "illusionist", "guardian", "chronomancer",
];

export const ARCHETYPE_NAMES = {
  architect: { pt: "Arquiteto", en: "Architect" },
  artificer: { pt: "Artífice", en: "Artificer" },
  illusionist: { pt: "Ilusionista", en: "Illusionist" },
  guardian: { pt: "Guardião", en: "Guardian" },
  chronomancer: { pt: "Cronomante", en: "Chronomancer" },
} as const;

export interface TechnologyDefinition {
  id: string;
  name: string;
  family: string;
  packages: readonly string[];
  configs?: readonly RegExp[];
}

export const SCHOOLS: readonly TechnologyDefinition[] = [
  { id: "react", name: "React", family: "ui-web", packages: ["react"] },
  { id: "vue", name: "Vue", family: "ui-web", packages: ["vue"] },
  { id: "svelte", name: "Svelte", family: "ui-web", packages: ["svelte"] },
  { id: "angular", name: "Angular", family: "ui-web", packages: ["@angular/core"] },
  { id: "nextjs", name: "Next.js", family: "meta-web", packages: ["next"], configs: [/^next\.config\.(?:js|mjs|cjs|ts)$/i] },
  { id: "nuxt", name: "Nuxt", family: "meta-web", packages: ["nuxt"], configs: [/^nuxt\.config\.(?:js|ts|mjs)$/i] },
  { id: "sveltekit", name: "SvelteKit", family: "meta-web", packages: ["@sveltejs/kit"], configs: [/^svelte\.config\.(?:js|ts)$/i] },
  { id: "astro", name: "Astro", family: "meta-web", packages: ["astro"], configs: [/^astro\.config\.(?:js|ts|mjs)$/i] },
  { id: "remix", name: "Remix", family: "meta-web", packages: ["@remix-run/react"] },
  { id: "express", name: "Express", family: "backend", packages: ["express"] },
  { id: "nestjs", name: "NestJS", family: "backend", packages: ["@nestjs/core"] },
  { id: "fastify", name: "Fastify", family: "backend", packages: ["fastify"] },
  { id: "django", name: "Django", family: "backend", packages: ["django"] },
  { id: "flask", name: "Flask", family: "backend", packages: ["flask"] },
  { id: "fastapi", name: "FastAPI", family: "backend", packages: ["fastapi"] },
  { id: "laravel", name: "Laravel", family: "backend", packages: ["laravel/framework"] },
  { id: "rails", name: "Rails", family: "backend", packages: ["rails"] },
  { id: "spring", name: "Spring", family: "backend", packages: ["org.springframework.boot", "org.springframework.boot:spring-boot-starter"] },
  { id: "aspnet-core", name: "ASP.NET Core", family: "backend", packages: ["Microsoft.AspNetCore.App", "Microsoft.AspNetCore"] },
  { id: "react-native", name: "React Native", family: "mobile", packages: ["react-native"] },
  { id: "expo", name: "Expo", family: "mobile", packages: ["expo"] },
  { id: "flutter", name: "Flutter", family: "mobile", packages: ["flutter"] },
] as const;

export const ARTIFACTS: readonly TechnologyDefinition[] = [
  { id: "vite", name: "Vite", family: "build", packages: ["vite"], configs: [/^vite\.config\.(?:js|ts|mjs)$/i] },
  { id: "webpack", name: "Webpack", family: "build", packages: ["webpack"], configs: [/^webpack\.config\.(?:js|ts|cjs|mjs)$/i] },
  { id: "rollup", name: "Rollup", family: "build", packages: ["rollup"], configs: [/^rollup\.config\./i] },
  { id: "esbuild", name: "esbuild", family: "build", packages: ["esbuild"] },
  { id: "docker", name: "Docker", family: "infra", packages: [], configs: [/(^|\/)Dockerfile$/i, /(^|\/)docker-compose\.ya?ml$/i, /(^|\/)compose\.ya?ml$/i] },
  { id: "github-actions", name: "GitHub Actions", family: "infra", packages: [], configs: [/^\.github\/workflows\/[^/]+\.ya?ml$/i] },
  { id: "terraform", name: "Terraform", family: "infra", packages: [], configs: [/\.tf$/i] },
  { id: "playwright", name: "Playwright", family: "testing", packages: ["@playwright/test"], configs: [/^playwright\.config\./i] },
  { id: "vitest", name: "Vitest", family: "testing", packages: ["vitest"], configs: [/^vitest\.config\./i] },
  { id: "jest", name: "Jest", family: "testing", packages: ["jest"], configs: [/^jest\.config\./i] },
  { id: "cypress", name: "Cypress", family: "testing", packages: ["cypress"], configs: [/^cypress\.config\./i] },
  { id: "storybook", name: "Storybook", family: "testing", packages: ["storybook", "@storybook/react", "@storybook/vue3"], configs: [/^\.storybook\/main\./i] },
  { id: "tailwind", name: "Tailwind CSS", family: "visual", packages: ["tailwindcss"], configs: [/^tailwind\.config\./i] },
  { id: "material-ui", name: "Material UI", family: "visual", packages: ["@mui/material"] },
  { id: "chakra-ui", name: "Chakra UI", family: "visual", packages: ["@chakra-ui/react"] },
  { id: "shadcn-ui", name: "shadcn/ui", family: "visual", packages: [], configs: [/^components\.json$/i] },
  { id: "electron", name: "Electron", family: "desktop", packages: ["electron"] },
  { id: "tauri", name: "Tauri", family: "desktop", packages: ["@tauri-apps/api", "tauri"] },
  { id: "pnpm", name: "pnpm", family: "toolchain", packages: ["pnpm"] },
  { id: "yarn", name: "Yarn", family: "toolchain", packages: ["yarn"] },
  { id: "eslint", name: "ESLint", family: "toolchain", packages: ["eslint"], configs: [/^eslint\.config\./i, /^\.eslintrc/i] },
  { id: "prettier", name: "Prettier", family: "toolchain", packages: ["prettier"], configs: [/^prettier\.config\./i, /^\.prettierrc/i] },
] as const;

export const IGNORED_PATH = /(^|\/)(?:node_modules|vendor|vendors|third[_-]?party|externals?|upstream|dist|build|coverage|generated|fixtures?)(\/|$)/i;
export const CONTEXTUAL_PATH = /(^|\/)(?:docs?|examples?|playground|demos?|fixtures?|templates?)(\/|$)/i;
