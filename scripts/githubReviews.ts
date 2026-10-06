import { z } from "zod";
import { readDataSourceConfig } from "@/data/datasource/config";
import { parsePayload } from "@/data/github/apiSchemas";
import { fetchContributionHistory, yearRange } from "@/data/github/contributions";
import { GitHubApiDataSource } from "@/data/github/GitHubApiDataSource";
import { GitHubHttpClient, type RequestContext } from "@/data/github/httpClient";
import { fetchUser } from "@/data/github/restFetchers";
import { assessReviews, PULL_REQUEST_REVIEWS_LAUNCH_DATE } from "@/data/github/reviewCoverage";
import { RequestStats } from "@/data/github/stats";
import { loadEnvFiles } from "./loadEnv";

/**
 * Optional manual check of Code Review coverage against the REAL GitHub API. Not part of `npm test` or CI.
 *
 *   npm run github:reviews -- torvalds             reviews per year, sum, coverage, requests, duration
 *   npm run github:reviews -- torvalds --verify    + per-year cross-checks (see below) and the full data source
 *   npm run github:reviews -- torvalds --audit     + pages EVERY review (1 request per 100): own-PR reviews,
 *                                                    PRs counted in two years (add --force above 3000 reviews)
 *
 * --verify, per year: totalPullRequestReviewContributions vs the connection's own totalCount, the earliest
 * review (nothing may predate the launch of PR reviews) and restrictedContributionsCount (private, never in totals).
 * Requires GITHUB_TOKEN (environment, .env.local or .env). Prints numbers only: never the token, never headers.
 */

const YEARS_PER_QUERY = 5;
const AUDIT_PAGE_SIZE = 100;
const AUDIT_LIMIT = 3_000;

const count = z.number().int().nonnegative();
const verifyYearSchema = z.object({
  totalPullRequestReviewContributions: count,
  restrictedContributionsCount: count,
  connection: z.object({ totalCount: count }),
  oldest: z.object({ nodes: z.array(z.object({ occurredAt: z.string() })) }),
});
const auditPageSchema = z.object({
  user: z.object({
    c: z.object({
      pullRequestReviewContributions: z.object({
        pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
        nodes: z.array(
          z.object({
            pullRequest: z.object({
              number: count,
              repository: z.object({ nameWithOwner: z.string() }),
              author: z.object({ login: z.string() }).nullable(),
            }),
          })
        ),
      }),
    }),
  }),
});

const pad = (value: string | number, width: number) => String(value).padStart(width);
const pct = (part: number, whole: number) => (whole === 0 ? "0%" : `${((part / whole) * 100).toFixed(1)}%`);

interface VerifyRow {
  year: number;
  total: number;
  connection: number;
  restricted: number;
  oldest: string | null;
}

async function verifyYears(client: GitHubHttpClient, login: string, years: number[], now: Date, ctx: RequestContext): Promise<VerifyRow[]> {
  const rows: VerifyRow[] = [];
  for (let i = 0; i < years.length; i += YEARS_PER_QUERY) {
    const batch = years.slice(i, i + YEARS_PER_QUERY);
    const aliases = batch
      .map((year) => {
        const { from, to } = yearRange(year, now);
        return `y${year}: contributionsCollection(from: "${from}", to: "${to}") {
          totalPullRequestReviewContributions restrictedContributionsCount
          connection: pullRequestReviewContributions(first: 1) { totalCount }
          oldest: pullRequestReviewContributions(first: 1, orderBy: { direction: ASC }) { nodes { occurredAt } } }`;
      })
      .join("\n");
    const data = (await client.graphql(`query ($login: String!) { user(login: $login) { ${aliases} } }`, { login }, ctx)) as {
      user: Record<string, unknown>;
    };
    for (const year of batch) {
      const parsed = parsePayload(verifyYearSchema, data.user[`y${year}`], `verify ${year}`);
      rows.push({
        year,
        total: parsed.totalPullRequestReviewContributions,
        connection: parsed.connection.totalCount,
        restricted: parsed.restrictedContributionsCount,
        oldest: parsed.oldest.nodes[0]?.occurredAt.slice(0, 10) ?? null,
      });
    }
  }
  return rows.sort((a, b) => a.year - b.year);
}

async function auditYears(client: GitHubHttpClient, login: string, years: number[], now: Date, ctx: RequestContext) {
  const seen = new Map<string, number>(); // PR -> years it was counted in
  let reviews = 0;
  let onOwnPullRequests = 0;
  for (const year of years) {
    const { from, to } = yearRange(year, now);
    let after: string | null = null;
    for (;;) {
      const query = `query ($login: String!, $after: String) { user(login: $login) { c: contributionsCollection(from: "${from}", to: "${to}") {
        pullRequestReviewContributions(first: ${AUDIT_PAGE_SIZE}, after: $after) { pageInfo { hasNextPage endCursor }
          nodes { pullRequest { number repository { nameWithOwner } author { login } } } } } } }`;
      const page: z.infer<typeof auditPageSchema> = parsePayload(auditPageSchema, await client.graphql(query, { login, after }, ctx), `audit ${year}`);
      const connection = page.user.c.pullRequestReviewContributions;
      for (const node of connection.nodes) {
        reviews++;
        const key = `${node.pullRequest.repository.nameWithOwner}#${node.pullRequest.number}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
        if (node.pullRequest.author?.login.toLowerCase() === login.toLowerCase()) onOwnPullRequests++;
      }
      if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) break;
      after = connection.pageInfo.endCursor;
    }
  }
  return { reviews, uniquePullRequests: seen.size, countedInSeveralYears: reviews - seen.size, onOwnPullRequests };
}

async function main(): Promise<void> {
  loadEnvFiles();
  const args = process.argv.slice(2);
  const username = args.find((arg) => !arg.startsWith("-"));
  if (!username) {
    console.error("Usage: npm run github:reviews -- <username> [--verify] [--audit [--force]]");
    process.exitCode = 2;
    return;
  }
  const config = readDataSourceConfig({ ...process.env, GITHUB_DATA_SOURCE: "github" });
  if (!config.githubToken) {
    console.error("GITHUB_TOKEN is required: reviews come from GraphQL, which has no anonymous access.");
    process.exitCode = 2;
    return;
  }

  const client = new GitHubHttpClient({ token: config.githubToken });
  const stats = new RequestStats();
  const ctx: RequestContext = { stats };
  const now = new Date();

  // The reviews slice of the pipeline, exactly as GitHubApiDataSource runs it.
  const startedAt = performance.now();
  const user = await fetchUser(client, username, ctx);
  const history = await fetchContributionHistory(client, user.login, user.created_at, now, ctx);
  const durationMs = Math.round(performance.now() - startedAt);
  const assessment = assessReviews(history);

  console.log(`username         ${user.login} (created ${user.created_at.slice(0, 10)})`);
  console.log(`reviews          ${assessment.metric.value} (${assessment.metric.coverage}, ${assessment.reason})`);
  console.log(`years read       ${assessment.byYear.length}${assessment.missingYears.length ? `, NOT read: ${assessment.missingYears.join(", ")}` : ""}`);
  console.log(`requests         ${stats.total} (REST ${stats.rest}, GraphQL ${stats.graphql})`);
  console.log(`duration         ${durationMs} ms`);
  console.log("");
  console.log("Year   Reviews");
  for (const { year, reviews } of assessment.byYear) console.log(`${year}  ${pad(reviews, 7)}`);
  console.log(`Sum    ${pad(assessment.byYear.reduce((sum, item) => sum + item.reviews, 0), 7)}`);

  const accountYears = assessment.byYear.map((item) => item.year);
  if (args.includes("--verify")) {
    const verifyStats = new RequestStats();
    const rows = await verifyYears(client, user.login, accountYears, now, { stats: verifyStats });
    console.log("");
    console.log("Verify (per year)  total  connection  private(restricted)  earliest review");
    for (const row of rows) {
      console.log(`${row.year}              ${pad(row.total, 5)}  ${pad(row.connection, 10)}  ${pad(row.restricted, 19)}  ${row.oldest ?? "-"}`);
    }
    const mismatches = rows.filter((row) => row.total !== row.connection || row.total !== assessment.byYear.find((y) => y.year === row.year)?.reviews);
    const earliest = rows.map((row) => row.oldest).filter((date): date is string => date !== null).sort()[0] ?? null;
    console.log(`total == connection.totalCount == data layer, every year: ${mismatches.length === 0 ? "yes" : `NO (${mismatches.map((m) => m.year).join(", ")})`}`);
    console.log(`earliest review: ${earliest ?? "none"} ${earliest !== null && earliest < PULL_REQUEST_REVIEWS_LAUNCH_DATE ? `<- BEFORE ${PULL_REQUEST_REVIEWS_LAUNCH_DATE}: unexpected` : `(PR reviews launched ${PULL_REQUEST_REVIEWS_LAUNCH_DATE})`}`);

    const source = new GitHubApiDataSource({ token: config.githubToken });
    const raw = await source.getProfile(user.login);
    console.log(`full data source: reviews ${raw.reviews.value} (${raw.reviews.coverage}) ${raw.reviews.value === assessment.metric.value && raw.reviews.coverage === assessment.metric.coverage ? "== slice" : "!= SLICE (unexpected)"}`);
    console.log(`verify requests  ${verifyStats.total} + full data source ${source.getReports().at(-1)?.totalRequests ?? "?"}`);
  }

  if (args.includes("--audit")) {
    const total = assessment.metric.value ?? 0;
    if (total > AUDIT_LIMIT && !args.includes("--force")) {
      console.log(`\nAudit skipped: ${total} reviews would cost ~${Math.ceil(total / AUDIT_PAGE_SIZE)} requests (add --force).`);
      return;
    }
    const auditStats = new RequestStats();
    const audit = await auditYears(client, user.login, accountYears, now, { stats: auditStats });
    console.log("");
    console.log(`Audit            ${audit.reviews} review contributions, ${audit.uniquePullRequests} distinct pull requests`);
    console.log(`  on own PRs      ${audit.onOwnPullRequests} (${pct(audit.onOwnPullRequests, audit.reviews)}): counted by GitHub, not excluded`);
    console.log(`  in 2+ years     ${audit.countedInSeveralYears} (${pct(audit.countedInSeveralYears, audit.reviews)}): a PR reviewed in two calendar years counts in both`);
    console.log(`  requests        ${auditStats.total}`);
  }
}

main().catch((error: unknown) => {
  // Typed errors only carry safe messages (no token, no headers).
  console.error(`Failed: ${error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"}`);
  process.exitCode = 1;
});
