import { defineConfig } from "@playwright/test";
import functionalConfig from "./playwright.config";

export default defineConfig(functionalConfig, {
  testMatch: "**/*Screenshots.spec.ts",
  testIgnore: [],
});
