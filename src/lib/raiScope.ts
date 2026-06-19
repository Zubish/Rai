import type { RaiDateRange } from "./types.js";

export type RaiQuestionScope = {
  dateRange: RaiDateRange;
  branchIds: string[];
};

const defaultDateRange: RaiDateRange = {
  startDate: "2026-01-01",
  endDate: "2026-06-17",
  label: "All available 2026 data"
};

const march2026: RaiDateRange = {
  startDate: "2026-03-01",
  endDate: "2026-03-31",
  label: "March 2026"
};

export function parseRaiQuestionScope(
  question: string,
  now: Date = new Date(),
  timezone = "Africa/Lagos"
): RaiQuestionScope {
  const lower = question.toLowerCase();

  return {
    dateRange: findDateRange(lower, now, timezone),
    branchIds: findBranchIds(lower)
  };
}

function findDateRange(question: string, now: Date, timezone: string): RaiDateRange {
  if (question.includes("yesterday")) {
    const date = zonedDateOffset(now, timezone, -1);
    return {
      startDate: date,
      endDate: date,
      label: `Yesterday (${date})`
    };
  }

  if (question.includes("today")) {
    const date = zonedDateOffset(now, timezone, 0);
    return {
      startDate: date,
      endDate: date,
      label: `Today (${date})`
    };
  }

  if (question.includes("march") || question.includes("last month")) {
    return march2026;
  }

  return defaultDateRange;
}

function findBranchIds(question: string): string[] {
  const patterns = [
    /\bfrom\s+([a-z0-9][a-z0-9 -]{0,40}?)\s+branch\b/i,
    /\bat\s+([a-z0-9][a-z0-9 -]{0,40}?)\s+branch\b/i,
    /\b([a-z0-9][a-z0-9 -]{0,40}?)\s+branch\b/i,
    /\bbranch\s+([a-z0-9][a-z0-9 -]{0,40})\b/i
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    const branchId = normalizeBranchId(match?.[1]);
    if (branchId) {
      return [branchId];
    }
  }

  return ["main"];
}

function normalizeBranchId(value: string | undefined): string | null {
  const normalized = value
    ?.replace(/\b(the|my|our|totalenergies|workspace)\b/gi, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || null;
}

function zonedDateOffset(now: Date, timezone: string, offsetDays: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const utcDate = new Date(Date.UTC(year, month - 1, day + offsetDays));

  return utcDate.toISOString().slice(0, 10);
}
