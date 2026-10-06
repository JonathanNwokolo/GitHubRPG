// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MockDataSource } from "./MockDataSource";
import { DataSourceConfigError, readDataSourceConfig } from "./config";
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
