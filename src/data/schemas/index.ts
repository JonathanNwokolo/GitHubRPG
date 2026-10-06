import { z } from "zod";
import type { RawGitHubData } from "../contracts";

const coverage = z.enum(["full", "partial", "unavailable"]);
const count = z.number().int().nonnegative();
const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid ISO date");

/** value may be null only when coverage is "unavailable". */
const rawMetric = z
  .object({ value: count.nullable(), coverage })
  .refine((m) => m.coverage === "unavailable" || m.value !== null, {
    message: "value is required unless coverage is 'unavailable'",
  });

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const rawYearActivity = z.object({
  year: z.number().int().min(2000).max(2100),
  contributions: count,
  commits: count,
  pullRequests: count,
  reviews: count,
  issues: count,
  activeDays: count,
});

const rawRepository = z.object({
  name: z.string().min(1),
  isFork: z.boolean(),
  stars: count,
  forks: count,
  languages: z.record(z.string().min(1), z.number().nonnegative()),
});

export const RawGitHubDataSchema = z
  .object({
    username: z.string().min(1).max(39),
    displayName: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    bio: z.string().nullish(),
    location: z.string().nullish(),
    company: z.string().nullish(),
    createdAt: isoDate,
    fetchedAt: isoDate,
    isDemo: z.boolean(),
    followers: rawMetric,
    commits: rawMetric,
    pullRequests: rawMetric,
    reviews: rawMetric,
    issues: rawMetric,
    repositories: z.object({ items: z.array(rawRepository), coverage }),
    languagesCoverage: coverage.optional(),
    activity: z.object({
      activeDays: rawMetric,
      longestStreakDays: rawMetric,
      currentStreakDays: rawMetric,
      recentActiveDays: rawMetric,
      monthlyContributions: z.object({ months: z.array(count), coverage }),
      yearly: z.object({ years: z.array(rawYearActivity), coverage }).optional(),
      longestStreakPeriod: z.object({ start: calendarDate, end: calendarDate }).nullish(),
    }),
  })
  .refine((d) => Date.parse(d.createdAt) <= Date.parse(d.fetchedAt), {
    message: "createdAt must not be after fetchedAt",
    path: ["createdAt"],
  });

/** Validation step of the pipeline: unknown -> RawGitHubData or a ZodError. */
export function validateRawGitHubData(input: unknown): RawGitHubData {
  return RawGitHubDataSchema.parse(input);
}
