// The grade and class chips on the student list. Schools type these by hand or
// import them, so "7а", "7А" and "7А " are one class here.
export type RosterClass = {
  grade_level: string | null;
  homeroom: string | null;
};

/** One chip: the text shown and every spelling stored for it. */
export type ClassOption = {
  label: string;
  values: string[];
};

export function gradeOptions(rows: RosterClass[]) {
  return groupOptions(rows.map((row) => row.grade_level));
}

/** Classes of one grade. A class named only "А" exists in several grades. */
export function classOptions(rows: RosterClass[], grade: ClassOption) {
  return groupOptions(
    rows
      .filter((row) => row.grade_level !== null && grade.values.includes(row.grade_level))
      .map((row) => row.homeroom),
  );
}

/** The chip a URL value names, or null when the school has no such chip. */
export function findOption(options: ClassOption[], value: string) {
  return options.find((option) => optionKey(option.label) === optionKey(value)) ?? null;
}

function groupOptions(values: Array<string | null>) {
  const options = new Map<string, ClassOption>();

  for (const value of values) {
    const key = optionKey(value);

    if (value === null || !key) continue;

    const option = options.get(key);

    if (!option) {
      options.set(key, { label: value.trim(), values: [value] });
    } else if (!option.values.includes(value)) {
      option.values.push(value);
    }
  }

  return Array.from(options.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "mn", { numeric: true }),
  );
}

function optionKey(value: string | null) {
  return (value ?? "").trim().toLocaleUpperCase("mn");
}
