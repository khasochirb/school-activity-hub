export type StudentJourneyCounts = {
  categoriesTried: number;
  clubsJoined: number;
  ideasProposed: number;
  sessionsAttended: number;
};

export type StudentMilestoneKey =
  | "firstClub"
  | "explorer"
  | "regular"
  | "ideaMaker";

export type StudentMilestone = {
  achieved: boolean;
  key: StudentMilestoneKey;
  progress: number;
  target: number;
};

// Milestones count only things a student does in person or proposes to staff.
// They are private progress ("2 of 3"), never compared between students.
const MILESTONE_RULES: Array<{
  count: keyof StudentJourneyCounts;
  key: StudentMilestoneKey;
  target: number;
}> = [
  { count: "clubsJoined", key: "firstClub", target: 1 },
  { count: "categoriesTried", key: "explorer", target: 3 },
  { count: "sessionsAttended", key: "regular", target: 5 },
  { count: "ideasProposed", key: "ideaMaker", target: 1 },
];

export function buildStudentMilestones(
  counts: StudentJourneyCounts,
): StudentMilestone[] {
  return MILESTONE_RULES.map((rule) => {
    const value = Math.max(0, Math.floor(counts[rule.count] || 0));

    return {
      achieved: value >= rule.target,
      key: rule.key,
      progress: Math.min(value, rule.target),
      target: rule.target,
    };
  });
}

export type DiscoverableClub = {
  category: string | null;
  id: string;
  name: string;
};

export type ClubsForInterests<TClub extends DiscoverableClub> = {
  forYou: Array<{ club: TClub; matchedInterest: string }>;
  interestsWithoutClubs: string[];
};

// Clubs matching the student's interests come first, in the order the student's
// interests are listed; within one interest, by name. An interest with no club
// is returned separately so the page can offer to propose one.
export function matchClubsToInterests<TClub extends DiscoverableClub>(
  clubs: TClub[],
  interests: string[],
  limit = 6,
): ClubsForInterests<TClub> {
  const forYou: Array<{ club: TClub; matchedInterest: string }> = [];
  const interestsWithoutClubs: string[] = [];

  for (const interest of uniqueValues(interests)) {
    const matches = clubs
      .filter((club) => club.category === interest)
      .sort((first, second) => first.name.localeCompare(second.name));

    if (!matches.length) {
      interestsWithoutClubs.push(interest);
      continue;
    }

    for (const club of matches) {
      forYou.push({ club, matchedInterest: interest });
    }
  }

  return {
    forYou: forYou.slice(0, Math.max(0, limit)),
    interestsWithoutClubs,
  };
}

export function parseInterestSelection(
  values: unknown[],
  allowedCategories: readonly string[],
) {
  const allowed = new Set(allowedCategories);

  return uniqueValues(
    values
      .map((value) => String(value ?? "").trim())
      .filter((value) => allowed.has(value)),
  );
}

export function countDistinctCategories(categories: Array<string | null>) {
  return new Set(
    categories.filter((category): category is string => Boolean(category)),
  ).size;
}

export function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "?";
  }

  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";

  return `${first}${last}`.toUpperCase();
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}
