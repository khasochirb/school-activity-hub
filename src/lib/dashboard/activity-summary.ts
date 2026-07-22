export type DashboardActivityEvent = {
  category: string | null;
  starts_at: string;
  status: string;
};

export type DashboardActivitySummary = {
  categories: Array<{
    category: string;
    count: number;
  }>;
  total: number;
  weeks: Array<{
    count: number;
    endsAt: string;
    startsAt: string;
  }>;
};

const WEEK_COUNT = 6;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getDashboardActivityRange(now: Date) {
  return {
    startsAt: now.toISOString(),
    endsAt: new Date(now.getTime() + WEEK_COUNT * WEEK_MS).toISOString(),
  };
}

export function buildDashboardActivitySummary(
  events: DashboardActivityEvent[],
  now: Date,
): DashboardActivitySummary {
  const range = getDashboardActivityRange(now);
  const rangeStart = new Date(range.startsAt).getTime();
  const rangeEnd = new Date(range.endsAt).getTime();
  const weeks = Array.from({ length: WEEK_COUNT }, (_, index) => {
    const startsAt = rangeStart + index * WEEK_MS;

    return {
      count: 0,
      endsAt: new Date(startsAt + WEEK_MS).toISOString(),
      startsAt: new Date(startsAt).toISOString(),
    };
  });
  const categoryCounts = new Map<string, number>();

  for (const event of events) {
    const startsAt = new Date(event.starts_at).getTime();

    if (
      event.status !== "approved" ||
      !Number.isFinite(startsAt) ||
      startsAt < rangeStart ||
      startsAt >= rangeEnd
    ) {
      continue;
    }

    const weekIndex = Math.floor((startsAt - rangeStart) / WEEK_MS);
    weeks[weekIndex].count += 1;

    const category = event.category?.trim();
    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
  }

  const categories = Array.from(categoryCounts, ([category, count]) => ({
    category,
    count,
  })).sort((left, right) =>
    right.count === left.count
      ? left.category.localeCompare(right.category)
      : right.count - left.count,
  );

  return {
    categories,
    total: weeks.reduce((total, week) => total + week.count, 0),
    weeks,
  };
}
