// Who has joined the app, by grade and class. No imports, so the tests run it
// directly.
export type RosterRow = {
  grade_level: string | null;
  homeroom: string | null;
  profile_id: string | null;
  status: string;
};

export type JoinedCount = {
  joined: number;
  label: string;
  total: number;
};

const NO_CLASS = "-";

/** Grades the school has. */
export function rosterGrades(rows: RosterRow[]) {
  return distinct(rows.map((row) => row.grade_level));
}

/** Classes of one grade, or of the whole school when no grade is chosen. */
export function rosterClasses(rows: RosterRow[], grade: string) {
  return distinct(rows.filter((row) => inGroup(row, grade, "")).map((row) => row.homeroom));
}

/**
 * Active students of the grade and class. Joined means the student has an
 * account, the same rule as the tag on each row of the list.
 */
export function countJoined(rows: RosterRow[], grade: string, classGroup: string) {
  const active = rows.filter((row) => row.status === "active" && inGroup(row, grade, classGroup));
  const joined = active.filter((row) => row.profile_id).length;

  return { joined, notJoined: active.length - joined };
}

/** One line per grade; once a grade is chosen, one line per class of it. */
export function joinedByClass(rows: RosterRow[], grade: string): JoinedCount[] {
  const counts = new Map<string, JoinedCount>();

  for (const row of rows) {
    if (row.status !== "active" || !inGroup(row, grade, "")) continue;

    const label = (grade ? row.homeroom : row.grade_level)?.trim() || NO_CLASS;
    const count = counts.get(label) ?? { joined: 0, label, total: 0 };

    count.total += 1;
    if (row.profile_id) count.joined += 1;
    counts.set(label, count);
  }

  return Array.from(counts.values()).sort((left, right) => naturalOrder(left.label, right.label));
}

function inGroup(row: RosterRow, grade: string, classGroup: string) {
  return (
    (!grade || row.grade_level?.trim() === grade) &&
    (!classGroup || row.homeroom?.trim() === classGroup)
  );
}

function distinct(values: Array<string | null>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  ).sort(naturalOrder);
}

function naturalOrder(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true });
}
