// Rules behind the platform admins' overview. Pure functions with no imports,
// so every definition and threshold is pinned by tests/platform-overview.test.mjs.
// Totals only: no name, code or attendance record of any student comes in here.

export const CODE_EXPIRY_DAYS = 7;
export const PENDING_DAYS = 3;
export const UPCOMING_DAYS = 30;
export const RECENT_DAYS = 7;

const DAY_MS = 86_400_000;

export type OverviewRows = {
  attendees: Array<{ status: string; student_roster_id: string | null }>;
  checkins: Array<{ checked_in_at: string; school_id: string }>;
  clubRequests: Array<{ created_at: string; school_id: string; status: string }>;
  clubs: Array<{ school_id: string }>;
  codes: Array<{ expires_at: string; status: string; student_roster_id: string | null }>;
  events: Array<{ created_at: string; school_id: string; starts_at: string; status: string }>;
  memberships: Array<{ student_roster_id: string }>;
  rosters: Array<{ id: string; profile_id: string | null; school_id: string }>;
  schools: Array<{ id: string; is_demo: boolean; name: string; slug: string }>;
  signups: Array<{ created_at: string; school_id: string }>;
  staff: Array<{ role: string; school_id: string }>;
};

export type SchoolSummary = {
  admins: number;
  attended: number;
  checkinsRecent: number;
  clubs: number;
  codeIssued: number;
  codesExpiring: number;
  id: string;
  inClub: number;
  isDemo: boolean;
  joined: number;
  lastSignup: string | null;
  name: string;
  noCode: number;
  pending: number;
  pendingOld: number;
  registered: number;
  slug: string;
  students: number;
  teachers: number;
  upcoming: number;
};

/**
 * One line per school. Students are the active students on the school's list.
 * Every later step counts those same students, and the club and event steps
 * count only students who have joined, so each step is part of the one before.
 */
export function summarizeSchools(rows: OverviewRows, now: Date): SchoolSummary[] {
  const time = now.getTime();
  const issued = new Set<string>();
  const usable = new Set<string>();
  const expiring = new Set<string>();

  for (const code of rows.codes) {
    if (!code.student_roster_id) continue;

    issued.add(code.student_roster_id);

    const expires = Date.parse(code.expires_at);

    if (code.status !== "active" || expires <= time) continue;

    usable.add(code.student_roster_id);

    if (expires <= time + CODE_EXPIRY_DAYS * DAY_MS) expiring.add(code.student_roster_id);
  }

  const inClub = new Set(rows.memberships.map((row) => row.student_roster_id));
  const registered = new Set<string>();
  const attended = new Set<string>();

  for (const row of rows.attendees) {
    if (!row.student_roster_id || row.status === "canceled") continue;

    registered.add(row.student_roster_id);

    if (row.status === "attended") attended.add(row.student_roster_id);
  }

  return rows.schools.map((school) => {
    const own = <T extends { school_id: string }>(list: T[]) =>
      list.filter((row) => row.school_id === school.id);
    const students = own(rows.rosters);
    const joined = students.filter((student) => student.profile_id);
    const waiting = students.filter((student) => !student.profile_id);
    const pending = [
      ...own(rows.events).filter((event) => event.status === "pending_approval"),
      ...own(rows.clubRequests).filter((request) => request.status === "pending"),
    ];
    const staff = own(rows.staff);

    return {
      admins: staff.filter((person) => person.role === "school_admin").length,
      attended: joined.filter((student) => attended.has(student.id)).length,
      checkinsRecent: own(rows.checkins).filter(
        (row) => Date.parse(row.checked_in_at) > time - RECENT_DAYS * DAY_MS,
      ).length,
      clubs: own(rows.clubs).length,
      codeIssued: students.filter((student) => student.profile_id || issued.has(student.id)).length,
      codesExpiring: waiting.filter((student) => expiring.has(student.id)).length,
      id: school.id,
      inClub: joined.filter((student) => inClub.has(student.id)).length,
      isDemo: school.is_demo,
      joined: joined.length,
      lastSignup: own(rows.signups).map((row) => row.created_at).sort().at(-1) ?? null,
      name: school.name,
      noCode: waiting.filter((student) => !usable.has(student.id)).length,
      pending: pending.length,
      pendingOld: pending.filter((row) => Date.parse(row.created_at) < time - PENDING_DAYS * DAY_MS).length,
      registered: joined.filter((student) => registered.has(student.id)).length,
      slug: school.slug,
      students: students.length,
      teachers: staff.filter((person) => person.role === "teacher").length,
      upcoming: own(rows.events).filter((event) => {
        const starts = Date.parse(event.starts_at);

        return event.status === "approved" && starts >= time && starts <= time + UPCOMING_DAYS * DAY_MS;
      }).length,
    };
  });
}

export type OverviewTotals = Record<
  | "attended" | "checkinsRecent" | "clubs" | "codeIssued" | "inClub" | "joined"
  | "pending" | "registered" | "schools" | "students" | "teachers" | "upcoming",
  number
>;

/** Platform totals. Demo schools hold made-up data and never count. */
export function overviewTotals(schools: SchoolSummary[]): OverviewTotals {
  const real = schools.filter((school) => !school.isDemo);
  const sum = (key: keyof SchoolSummary) =>
    real.reduce((total, school) => total + (school[key] as number), 0);

  return {
    attended: sum("attended"),
    checkinsRecent: sum("checkinsRecent"),
    clubs: sum("clubs"),
    codeIssued: sum("codeIssued"),
    inClub: sum("inClub"),
    joined: sum("joined"),
    pending: sum("pending"),
    registered: sum("registered"),
    schools: real.length,
    students: sum("students"),
    teachers: sum("teachers"),
    upcoming: sum("upcoming"),
  };
}

export const FUNNEL_STEPS = [
  "students", "codeIssued", "joined", "inClub", "registered", "attended",
] as const;

/** Whole percent of the students on the list; null when there are none. */
export function shareOf(value: number, base: number) {
  return base ? Math.round((value / base) * 100) : null;
}

export type OverviewCheckId = "adminMissing" | "noClubs" | "noCode" | "codesExpiring" | "pendingOld" | "noUpcoming";
export type OverviewCheck = {
  count: number;
  id: OverviewCheckId;
  schools: string[];
  state: "fail" | "ok" | "warn";
};

/** What needs someone today, most serious first. Demo schools are left out. */
export function overviewChecks(schools: SchoolSummary[]): OverviewCheck[] {
  const real = schools.filter((school) => !school.isDemo);
  const check = (
    id: OverviewCheckId,
    state: "fail" | "warn",
    hit: (school: SchoolSummary) => number,
  ): OverviewCheck => {
    const hits = real.filter((school) => hit(school) > 0);

    return {
      count: hits.reduce((total, school) => total + hit(school), 0),
      id,
      schools: hits.map((school) => school.name),
      state: hits.length ? state : "ok",
    };
  };

  return [
    check("adminMissing", "fail", (school) => (school.admins ? 0 : 1)),
    // Students who sign up would find nothing to join.
    check("noClubs", "warn", (school) => (school.clubs ? 0 : 1)),
    check("codesExpiring", "warn", (school) => school.codesExpiring),
    check("noCode", "warn", (school) => school.noCode),
    check("pendingOld", "warn", (school) => school.pendingOld),
    // A school nobody has joined yet has no one to plan for.
    check("noUpcoming", "warn", (school) => (school.joined && !school.upcoming ? 1 : 0)),
  ];
}

/** One point per day, oldest first, ending today; days with nothing are 0. */
export function dailyCounts(days: string[], length: number, today: string) {
  const byDay = new Map<string, number>();

  for (const day of days) byDay.set(day, (byDay.get(day) ?? 0) + 1);

  return Array.from({ length }, (_, index) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index - length + 1);
    const day = date.toISOString().slice(0, 10);

    return { count: byDay.get(day) ?? 0, day };
  });
}
