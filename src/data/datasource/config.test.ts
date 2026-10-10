// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MockDataSource } from "./MockDataSource";
import {
  DataSourceConfigError,
  getVercelEnvironment,
  isGameEngineV2UiEnabled,
  readDataSourceConfig,
  readGameEngineV2UiConfig,
  readUsageCounterConfig,
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

describe("readUsageCounterConfig", () => {
  const store = { UPSTASH_REDIS_REST_URL: "https://redis.example.test", UPSTASH_REDIS_REST_TOKEN: "t" };
  const production = { ...store, NODE_ENV: "production", GITHUB_DATA_SOURCE: "github", VERCEL: "1", VERCEL_ENV: "production" };

  it("is on for real production traffic with the store configured", () => {
    expect(readUsageCounterConfig(production)).toEqual({ enabled: true, restUrl: "https://redis.example.test", restToken: "t" });
  });

  it("accepts the Marketplace KV_REST_API_* names as equivalents", () => {
    const { UPSTASH_REDIS_REST_URL: _url, UPSTASH_REDIS_REST_TOKEN: _token, ...rest } = production;
    expect(readUsageCounterConfig({ ...rest, KV_REST_API_URL: "https://kv.example.test", KV_REST_API_TOKEN: "k" })).toEqual({
      enabled: true,
      restUrl: "https://kv.example.test",
      restToken: "k",
    });
  });

  it("never counts mock, development, preview or local traffic", () => {
    expect(readUsageCounterConfig({ ...production, GITHUB_DATA_SOURCE: "mock" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...production, VERCEL_ENV: "preview" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...production, VERCEL_ENV: "development" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...store, NODE_ENV: "development", GITHUB_DATA_SOURCE: "github" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...store, GITHUB_DATA_SOURCE: "github" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...store, NODE_ENV: "test" }).enabled).toBe(false);
  });

  it("is off without both store variables, with a bad URL, or with a misconfigured data source", () => {
    expect(readUsageCounterConfig({ ...production, UPSTASH_REDIS_REST_TOKEN: "" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...production, UPSTASH_REDIS_REST_URL: undefined }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...production, UPSTASH_REDIS_REST_URL: "not a url" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...production, UPSTASH_REDIS_REST_URL: "http://redis.example.test" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...production, GITHUB_DATA_SOURCE: undefined }).enabled).toBe(false);
    expect(readUsageCounterConfig({}).enabled).toBe(false);
  });

  it("USAGE_COUNTER_ENABLED=false is a kill switch", () => {
    for (const off of ["false", "FALSE", "0", "off", "no"]) {
      expect(readUsageCounterConfig({ ...production, USAGE_COUNTER_ENABLED: off })).toEqual({ enabled: false });
    }
    expect(readUsageCounterConfig({ ...production, USAGE_COUNTER_ENABLED: "true" }).enabled).toBe(true);
  });

  it("exposes no credential when disabled", () => {
    expect(readUsageCounterConfig({ ...production, VERCEL_ENV: "preview" })).toEqual({ enabled: false });
  });

  it("the e2e seam works only on the mock source and never on Vercel", () => {
    const e2e = { ...store, UPSTASH_REDIS_REST_URL: "http://127.0.0.1:3917", USAGE_COUNTER_E2E: "1", GITHUB_DATA_SOURCE: "mock", NODE_ENV: "production" };
    expect(readUsageCounterConfig(e2e).enabled).toBe(true);
    expect(readUsageCounterConfig({ ...e2e, VERCEL: "1" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...e2e, GITHUB_DATA_SOURCE: "github" }).enabled).toBe(false);
    expect(readUsageCounterConfig({ ...e2e, USAGE_COUNTER_E2E: undefined }).enabled).toBe(false);
  });
});
