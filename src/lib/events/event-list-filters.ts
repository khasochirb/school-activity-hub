// The second row of filters on the events list. Several can be on at once, kept
// in one URL parameter (?with=free,week). Unknown values are ignored.
export const EVENT_LIST_FILTERS = [
  "week",
  "free",
  "no-permission",
  "beginner",
] as const;

export type EventListFilter = (typeof EVENT_LIST_FILTERS)[number];

export function parseEventListFilters(value: string): EventListFilter[] {
  const requested = value.split(",");

  return EVENT_LIST_FILTERS.filter((filter) => requested.includes(filter));
}

export function toggleEventListFilter(
  selected: EventListFilter[],
  filter: EventListFilter,
): EventListFilter[] {
  return EVENT_LIST_FILTERS.filter((item) =>
    item === filter ? !selected.includes(filter) : selected.includes(item),
  );
}

/**
 * Column filters in the events table. An event that does not state its cost or
 * level is not listed as free or beginner friendly.
 */
export function eventListColumnFilters(
  selected: EventListFilter[],
): Array<[column: string, value: boolean | string]> {
  const columns: Array<[string, boolean | string]> = [];

  if (selected.includes("free")) columns.push(["cost_type", "free"]);
  if (selected.includes("no-permission")) columns.push(["permission_required", false]);
  if (selected.includes("beginner")) {
    columns.push(["experience_level", "beginner_friendly"]);
  }

  return columns;
}

/** Monday and Sunday (YYYY-MM-DD) of the week holding this day. */
export function weekDayKeys(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    monday: monday.toISOString().slice(0, 10),
    sunday: sunday.toISOString().slice(0, 10),
  };
}
