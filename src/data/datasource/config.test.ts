// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MockDataSource } from "./MockDataSource";
import {
  DataSourceConfigError,
  getVercelEnvironment,
  isGameEngineV2UiEnabled,
  readDataSourceConfig,
  readGameEngineV2UiConfig,
} from "./config";
import { createDataSource, resolveDataSourceKind } from "./index";
import { GitHubApiDataSource } from "../github/GitHubApiDataSource";

describe("readDataSourceConfig", () => {
  it("defaults to mock outside production", () => {
    expect(readDataSourceConfig({}).kind).toBe("mock");
    expect(readDataSourceConfig({ NODE_ENV: "development" }).kind).toBe("mock");
    expect(readDataSourceConfig({ NODE_ENV: "test" }).kind).toBe("mock");
  });

  it("requires an explicit choice in production", () => {
    expect(() => readDataSourceConfig({ NODE_ENV: "production" })).toThrow(DataSourceConfigError);
    expect(readDataSourceConfig({ NODE_ENV: "production", GITHUB_DATA_SOURCE: "mock" }).kind).toBe("mock");
    expect(readDataSourceConfig({ NODE_ENV: "production", GITHUB_DATA_SOURCE: "github" }).kind).toBe("github");
  });

  it("rejects unknown values instead of guessing", () => {
    expect(() => readDataSourceConfig({ GITHUB_DATA_SOURCE: "gitlab" })).toThrow(DataSourceConfigError);
  });

  it("is case-insensitive and trims", () => {
    expect(readDataSourceConfig({ GITHUB_DATA_SOURCE: " GitHub " }).kind).toBe("github");
  });

  it("starts without a token", () => {
    expect(readDataSourceConfig({ GITHUB_DATA_SOURCE: "github" }).githubToken).toBeUndefined();
    expect(readDataSourceConfig({ GITHUB_DATA_SOURCE: "github", GITHUB_TOKEN: "   " }).githubToken).toBeUndefined();
  });

  it("reads the token only for the github source", () => {
    expect(readDataSourceConfig({ GITHUB_DATA_SOURCE: "github", GITHUB_TOKEN: " ghp_x " }).githubToken).toBe("ghp_x");
    expect(readDataSourceConfig({ GITHUB_DATA_SOURCE: "mock", GITHUB_TOKEN: "ghp_x" }).githubToken).toBeUndefined();
  });

  it("logs fetch reports in development only", () => {
    expect(readDataSourceConfig({ NODE_ENV: "development" }).logFetchReports).toBe(true);
    expect(readDataSourceConfig({ NODE_ENV: "production", GITHUB_DATA_SOURCE: "github" }).logFetchReports).toBe(false);
  });
});

describe("Vercel environment partition", () => {
  it("accepts only platform environment names and otherwise uses local", () => {
    expect(getVercelEnvironment({ VERCEL_ENV: " preview " })).toBe("preview");
    expect(getVercelEnvironment({ VERCEL_ENV: "production" })).toBe("production");
    expect(getVercelEnvironment({ VERCEL_ENV: "attacker-value" })).toBe("local");
    expect(getVercelEnvironment({})).toBe("local");
  });
});

describe("Game Engine V2 product flag", () => {
  it("is off by default and fails closed for unknown values", () => {
    expect(readGameEngineV2UiConfig({}).enabled).toBe(false);
    expect(readGameEngineV2UiConfig({ GAME_ENGINE_V2_UI_ENABLED: "maybe" }).enabled).toBe(false);
  });

  it("supports one server-side flag plus an optional normalized allowlist", () => {
    const env = { GAME_ENGINE_V2_UI_ENABLED: "true", GAME_ENGINE_V2_UI_ALLOWLIST: " Torvalds, JonathanNwokolo " };
    expect(isGameEngineV2UiEnabled("torvalds", env)).toBe(true);
    expect(isGameEngineV2UiEnabled("JONATHANNWOKOLO", env)).toBe(true);
    expect(isGameEngineV2UiEnabled("ahejlsberg", env)).toBe(false);
    expect(isGameEngineV2UiEnabled("anyone", { GAME_ENGINE_V2_UI_ENABLED: "1" })).toBe(true);
  });
});

describe("createDataSource", () => {
  it("builds the source named by the config and reuses it", () => {
    const mock = createDataSource({ kind: "mock", logFetchReports: false });
    expect(mock).toBeInstanceOf(MockDataSource);
    expect(createDataSource({ kind: "mock", logFetchReports: false })).toBe(mock);

    const github = createDataSource({ kind: "github", githubToken: "ghp_x", logFetchReports: false });
    expect(github).toBeInstanceOf(GitHubApiDataSource);
    expect(github.kind).toBe("github");
    expect(createDataSource({ kind: "github", githubToken: "ghp_x", logFetchReports: false })).toBe(github);
  });

  it("resolveDataSourceKind never throws", () => {
    expect(["mock", "github", null]).toContain(resolveDataSourceKind());
  });
});
