import Link from "next/link";
import { AutoSubmitSelect } from "../_components/auto-submit-select";
import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import {
  getPageParam,
  getSearchParam,
  matchesSearch,
  pageRange,
  pageRows,
  postgrestSearchPattern,
} from "@/lib/list-filters";
import { timeServer } from "@/lib/server-timing";
import {
  countJoined,
  joinedByClass,
  rosterClasses,
  rosterGrades,
  type RosterRow,
} from "@/lib/students/roster-counts";
import { createClient } from "@/lib/supabase/server";
import {
  CollapsibleFormSection,
  EmptyState,
  FormSectionToggleButton,
  NoResultsState,
  PaginationControls,
} from "../_components/page-ui";
import { ActionMenu } from "../_components/action-menu";
import { PageHead, Widget } from "../_components/clean-ui";
import { markStudentActive, markStudentInactive } from "./actions";
import { CreateStudentForm } from "./create-student-form";
import { ImportStudentsForm } from "./import-students-form";

type StaffProfile = {
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  homeroom: string | null;
  student_number: string | null;
  status: string;
  created_at: string;
  profile_id: string | null;
};

type StudentsSearchParams = {
  class?: string | string[];
  grade?: string | string[];
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
};

const STUDENTS_PAGE_SIZE = 50;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<StudentsSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const params = await searchParams;
  const searchQuery = getSearchParam(params.q);
  const selectedStatus = parseRosterStatus(getSearchParam(params.status));
  const page = getPageParam(params.page);
  const range = pageRange(page, STUDENTS_PAGE_SIZE);
  const supabase = await createClient();
  const user = await timeServer("students.query.auth-get-user", () =>
    getCurrentUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer("students.query.profile", () =>
    supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .maybeSingle<StaffProfile>(),
  );

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Grade (анги) and class group (бүлэг), e.g. grade "10", class "10а". A class
  // left over from another grade is dropped, so the list matches the menus.
  const rosterRows = await getRosterRows(supabase, profile.school_id);
  const gradeOptions = rosterGrades(rosterRows);
  const selectedGrade = pickOption(gradeOptions, getSearchParam(params.grade));
  const classOptions = rosterClasses(rosterRows, selectedGrade);
  const selectedClass = pickOption(classOptions, getSearchParam(params.class));
  const listFilters = { classGroup: selectedClass, grade: selectedGrade };
  const joinedCount = countJoined(rosterRows, selectedGrade, selectedClass);
  const joinedLines = joinedByClass(rosterRows, selectedGrade);

  let studentsQuery = supabase
    .from("student_rosters")
    .select(
      "id, first_name, last_name, grade_level, homeroom, student_number, status, created_at, profile_id",
    )
    .eq("school_id", profile.school_id);

  if (selectedStatus === "joined") {
    studentsQuery = studentsQuery.eq("status", "active").not("profile_id", "is", null);
  } else if (selectedStatus === "not-joined") {
    studentsQuery = studentsQuery.eq("status", "active").is("profile_id", null);
  } else if (selectedStatus) {
    studentsQuery = studentsQuery.eq("status", selectedStatus);
  }

  if (selectedGrade) {
    studentsQuery = studentsQuery.eq("grade_level", selectedGrade);
  }

  if (selectedClass) {
    studentsQuery = studentsQuery.eq("homeroom", selectedClass);
  }

  const searchFilter = studentSearchFilter(searchQuery);

  if (searchFilter) {
    studentsQuery = studentsQuery.or(searchFilter);
  }

  const { data: students, error } = await timeServer(
    "students.query.roster-list",
    () =>
      studentsQuery
        .order("created_at", { ascending: false })
        .range(range.from, range.to)
        .returns<Student[]>(),
  );
  const { hasNextPage, rows: roster } = pageRows(students, STUDENTS_PAGE_SIZE);
  const filteredStudents = roster.filter((student) =>
    matchesSearch(searchQuery, [
      student.first_name,
      student.last_name,
      student.student_number,
      `${student.first_name} ${student.last_name}`,
    ]),
  );
  const hasFilters = Boolean(searchQuery || selectedStatus || selectedGrade || selectedClass);
  const [rowStats, summary] = await Promise.all([
    getRowStats(supabase, profile.school_id, filteredStudents.map((student) => student.id)),
    getRosterSummary(supabase, profile.school_id),
  ]);

  return (
    <div className="cl-page">
      <PageHead
        action={
          <ActionMenu
            buttonClassName="btn btn-primary min-h-11 gap-1.5"
            buttonLabel={<>+ {t("students.list.add")}</>}
            items={[
              { hint: t("students.addSection.description"), href: "#add-student", label: t("students.actions.add") },
              { hint: t("students.importSection.description"), href: "#import-csv", label: t("students.actions.importCsv") },
            ]}
            label={t("students.list.add")}
          />
        }
        subtitle={tf("students.list.subtitle", { count: summary.active })}
        title={t("students.title")}
      />

      <CollapsibleFormSection
        description={t("students.addSection.description")}
        hideLabel={t("common.hideForm")}
        id="add-student"
        showLabel={t("common.showForm")}
        title={t("students.addSection.title")}
      >
        <CreateStudentForm
          labels={{
            adding: t("students.form.adding"),
            classGroup: t("students.form.classGroup"),
            fullName: t("students.form.fullName"),
            grade: t("students.form.grade"),
            studentNumber: t("students.form.studentNumber"),
            submit: t("students.form.submit"),
          }}
        />
      </CollapsibleFormSection>

      <CollapsibleFormSection
        description={t("students.importSection.description")}
        hideLabel={t("common.hideForm")}
        id="import-csv"
        showLabel={t("common.showForm")}
        title={t("students.importSection.title")}
      >
        <ImportStudentsForm
          labels={{
            fileLabel: t("students.import.fileLabel"),
            importing: t("students.import.importing"),
            sampleCsv: t("students.import.sampleCsv"),
            sampleTitle: t("students.import.sampleTitle"),
            submit: t("students.import.submit"),
          }}
        />
      </CollapsibleFormSection>

      <div className="cl-filters">
        {([
          ["active", t("filters.active"), null],
          ["inactive", t("filters.inactive"), null],
          ["", t("filters.all"), null],
          ["joined", t("students.list.joinedApp"), joinedCount.joined],
          ["not-joined", t("students.list.notJoined"), joinedCount.notJoined],
        ] as const).map(([value, label, count]) => (
          <Link
            aria-current={selectedStatus === value ? "page" : undefined}
            className="cl-chip"
            href={studentsPageHref(1, searchQuery, value, listFilters)}
            key={value || "all"}
            prefetch={false}
          >
            {label}
            {count === null ? null : <span className="cl-chip-count">{count}</span>}
          </Link>
        ))}
        <form action="/students" className="cl-search" role="search">
          <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="sr-only">{t("filters.search")}</span>
          <input defaultValue={searchQuery} name="q" placeholder={t("students.list.searchPlaceholder")} type="search" />
          {selectedStatus ? <input name="status" type="hidden" value={selectedStatus} /> : null}
          {selectedGrade ? <input name="grade" type="hidden" value={selectedGrade} /> : null}
          {selectedClass ? <input name="class" type="hidden" value={selectedClass} /> : null}
        </form>
        <form action="/students" className="cl-filter-selects">
          {searchQuery ? <input name="q" type="hidden" value={searchQuery} /> : null}
          {selectedStatus ? <input name="status" type="hidden" value={selectedStatus} /> : null}
          <AutoSubmitSelect
            defaultValue={selectedGrade}
            key={`grade-${selectedGrade}`}
            label={t("students.filters.grade")}
            name="grade"
          >
            <option value="">{t("students.filters.allGrades")}</option>
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {t("students.table.grade")} {grade}
              </option>
            ))}
          </AutoSubmitSelect>
          <AutoSubmitSelect
            defaultValue={selectedClass}
            key={`class-${selectedGrade}-${selectedClass}`}
            label={t("students.filters.classGroup")}
            name="class"
          >
            <option value="">{t("students.filters.allClasses")}</option>
            {classOptions.map((classGroup) => (
              <option key={classGroup} value={classGroup}>
                {classGroup}
              </option>
            ))}
          </AutoSubmitSelect>
          <noscript>
            <button className="cl-chip" type="submit">{t("filters.apply")}</button>
          </noscript>
        </form>
      </div>

      <div className="cl-split" data-lead-box="">
      <div className="cl-main">

      <section className="flex min-w-0 flex-col gap-3">
        {error ? (
          <p className="notice-box notice-warning">
            {tf("students.errors.loadFailed", {
              error: t("common.somethingWentWrong"),
            })}
          </p>
        ) : null}
        {roster.length && filteredStudents.length ? (
          <div className="cl-card cl-rows">
            {filteredStudents.map((student) => {
              const name = `${student.first_name} ${student.last_name}`;
              const stats = rowStats.get(student.id);

              return (
                <div className="cl-row" key={student.id}>
                  <span aria-hidden="true" className="cl-av" style={{ background: avatarColor(name), color: "#1b1a17" }}>
                    {(student.first_name[0] ?? "") + (student.last_name[0] ?? "")}
                  </span>
                  <span className="cl-grow">
                    <span className="cl-row-title">{name}</span>
                    <span className="cl-row-sub">
                      {[
                        student.grade_level ? `${t("students.table.grade")} ${student.grade_level}` : null,
                        student.homeroom,
                        student.student_number,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="cl-row-end">
                  <span className="cl-row-cols">
                    <span>
                      <b>{stats?.clubs ?? 0}</b> {t("students.list.clubs")}
                    </span>
                    <span>
                      <b>{stats?.events ?? 0}</b> {t("students.list.events")}
                    </span>
                  </span>
                  {student.status !== "active" ? (
                    <span className="cl-tag">{statusLabel(student.status, t)}</span>
                  ) : student.profile_id ? (
                    <span className="cl-tag" data-tone="ok">{t("students.list.joinedApp")}</span>
                  ) : (
                    <span className="cl-tag" data-tone="warn">{t("students.list.notJoined")}</span>
                  )}
                  <InactiveForm
                    labels={{
                      alreadyInactive: "",
                      markInactive: t("students.actions.markInactive"),
                      reactivate: t("students.actions.reactivate"),
                      saving: t("common.saving"),
                    }}
                    student={student}
                  />
                  </span>
                  <ActionMenu
                    items={[
                      { href: `/portfolio/students/${student.id}`, label: t("portfolio.staff.viewPortfolio") },
                      { href: "/invite-codes", label: t("students.list.inviteCode") },
                      ...(profile.role === "school_admin"
                        ? [{ href: `/students/${student.id}/reset`, label: t("students.reset.menu") }]
                        : []),
                    ]}
                    label={t("common.moreActions")}
                  />
                </div>
              );
            })}
          </div>
        ) : hasFilters ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/students"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              action={
                <>
                  <FormSectionToggleButton targetId="add-student">
                    {t("students.actions.add")}
                  </FormSectionToggleButton>
                  <FormSectionToggleButton targetId="import-csv" variant="secondary">
                    {t("students.actions.importCsv")}
                  </FormSectionToggleButton>
                </>
              }
              description={t("students.empty.description")}
              title={t("students.empty.title")}
            />
          </div>
        )}
        {!error && (filteredStudents.length > 0 || page > 1) ? (
          <PaginationControls
            getHref={(nextPage) =>
              studentsPageHref(nextPage, searchQuery, selectedStatus, listFilters)
            }
            hasNextPage={hasNextPage}
            labels={{
              next: t("common.next"),
              page: tf("common.pageNumber", { number: page }),
              previous: t("common.previous"),
            }}
            page={page}
          />
        ) : null}
      </section>
      </div>

      <aside className="cl-side">
        <Widget title={t("students.list.byGrade")}>
          {joinedLines.length ? (
            joinedLines.map((line) => (
              <div className="cl-goal" key={line.label}>
                <div>
                  <span>{selectedGrade ? line.label : `${t("students.table.grade")} ${line.label}`}</span>
                  <span>
                    {t("students.list.joinedApp")}{" "}
                    <b>
                      {line.joined} / {line.total}
                    </b>
                  </span>
                </div>
                <div className="cl-bar">
                  <i style={{ width: `${(line.joined / line.total) * 100}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">{t("students.empty.title")}</p>
          )}
        </Widget>
        <Widget
          link={{ href: "/invite-codes", label: t("nav.inviteCodes") }}
          title={t("students.list.notJoinedYet")}
        >
          {summary.notJoined.length ? (
            summary.notJoined.slice(0, 4).map((student) => (
              <div key={student.id}>
                <b className="block text-sm">
                  {student.first_name} {student.last_name}
                </b>
                <span className="text-[13px] text-[var(--muted)]">
                  {[student.grade_level ? `${t("students.table.grade")} ${student.grade_level}` : null, student.homeroom]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">{t("students.list.everyoneJoined")}</p>
          )}
        </Widget>
        <Widget title={t("students.list.participation")}>
          <p className="cl-statline">
            <span>
              <b>{summary.active ? Math.round((summary.inClub / summary.active) * 100) : 0}%</b>
              {t("students.list.inAClub")}
            </span>
            <span>
              <b>{summary.active ? (summary.signups / summary.active).toFixed(1) : "0"}</b>
              {t("students.list.eventsEach")}
            </span>
          </p>
        </Widget>
      </aside>
      </div>
    </div>
  );
}

function InactiveForm({
  labels,
  student,
}: {
  labels: {
    alreadyInactive: string;
    markInactive: string;
    reactivate: string;
    saving: string;
  };
  student: Student;
}) {
  if (student.status !== "active") {
    return (
      <form action={markStudentActive}>
        <input name="student_id" type="hidden" value={student.id} />
        <PendingSubmitButton
          className="btn btn-secondary min-h-9 px-3"
          pendingLabel={labels.saving}
          toastMessage={labels.saving}
        >
          {labels.reactivate}
        </PendingSubmitButton>
      </form>
    );
  }

  return (
    <form action={markStudentInactive}>
      <input name="student_id" type="hidden" value={student.id} />
      <PendingSubmitButton
        className="btn btn-quiet min-h-9 px-3"
        pendingLabel={labels.saving}
        toastMessage={labels.saving}
      >
        {labels.markInactive}
      </PendingSubmitButton>
    </form>
  );
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === "active") {
    return t("status.active");
  }

  if (status === "inactive") {
    return t("status.inactive");
  }

  return status;
}

function parseRosterStatus(value: string) {
  return ["active", "inactive", "joined", "not-joined"].includes(value) ? value : "";
}

function pickOption(options: string[], value: string) {
  return options.includes(value) ? value : "";
}

function studentSearchFilter(searchQuery: string) {
  const filters = searchQuery
    .split(/\s+/)
    .map(postgrestSearchPattern)
    .filter(Boolean)
    .slice(0, 3)
    .flatMap((pattern) => [
      `first_name.ilike.${pattern}`,
      `last_name.ilike.${pattern}`,
      `student_number.ilike.${pattern}`,
    ]);

  return filters.length ? filters.join(",") : "";
}

function studentsPageHref(
  page: number,
  searchQuery: string,
  selectedStatus: string,
  filters: { classGroup: string; grade: string },
) {
  const params = new URLSearchParams();

  if (filters.grade) {
    params.set("grade", filters.grade);
  }

  if (filters.classGroup) {
    params.set("class", filters.classGroup);
  }

  if (searchQuery) {
    params.set("q", searchQuery);
  }

  if (selectedStatus) {
    params.set("status", selectedStatus);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/students?${query}` : "/students";
}

// Every student's grade, class and whether they joined. The database returns
// at most 1,000 rows a time, so a bigger school is read in pages.
async function getRosterRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
) {
  const pageSize = 1000;
  const rows: RosterRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data } = await timeServer("students.query.roster-rows", () =>
      supabase
        .from("student_rosters")
        .select("grade_level, homeroom, profile_id, status")
        .eq("school_id", schoolId)
        .order("id")
        .range(from, from + pageSize - 1)
        .returns<RosterRow[]>(),
    );

    rows.push(...(data ?? []));

    if ((data?.length ?? 0) < pageSize) return rows;
  }
}

// Clubs and event sign-ups for the students shown on this page.
async function getRowStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
  rosterIds: string[],
) {
  const stats = new Map<string, { clubs: number; events: number }>();

  if (!rosterIds.length) return stats;

  const [{ data: memberships }, { data: attendees }] = await Promise.all([
    timeServer("students.query.row-clubs", () =>
      supabase
        .from("club_memberships")
        .select("student_roster_id")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .in("student_roster_id", rosterIds)
        .returns<Array<{ student_roster_id: string }>>(),
    ),
    timeServer("students.query.row-events", () =>
      supabase
        .from("event_attendees")
        .select("student_roster_id")
        .eq("school_id", schoolId)
        .in("status", ["registered", "attended"])
        .in("student_roster_id", rosterIds)
        .returns<Array<{ student_roster_id: string }>>(),
    ),
  ]);
  const bump = (id: string, key: "clubs" | "events") => {
    const current = stats.get(id) ?? { clubs: 0, events: 0 };
    current[key] += 1;
    stats.set(id, current);
  };

  for (const row of memberships ?? []) bump(row.student_roster_id, "clubs");
  for (const row of attendees ?? []) bump(row.student_roster_id, "events");

  return stats;
}

// Whole-school numbers for the side column.
async function getRosterSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
) {
  const [{ data: rosters }, { data: memberships }, { count: signups }] = await Promise.all([
    timeServer("students.query.summary-rosters", () =>
      supabase
        .from("student_rosters")
        .select("id, first_name, last_name, grade_level, homeroom, profile_id")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .returns<
          Array<{
            first_name: string;
            grade_level: string | null;
            homeroom: string | null;
            id: string;
            last_name: string;
            profile_id: string | null;
          }>
        >(),
    ),
    timeServer("students.query.summary-memberships", () =>
      supabase
        .from("club_memberships")
        .select("student_roster_id")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .returns<Array<{ student_roster_id: string }>>(),
    ),
    timeServer("students.query.summary-signups", () =>
      supabase
        .from("event_attendees")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .not("student_roster_id", "is", null)
        .in("status", ["registered", "attended"]),
    ),
  ]);
  const active = rosters ?? [];
  const activeIds = new Set(active.map((roster) => roster.id));

  return {
    active: active.length,
    inClub: new Set(
      (memberships ?? [])
        .map((row) => row.student_roster_id)
        .filter((id) => activeIds.has(id)),
    ).size,
    notJoined: active.filter((roster) => !roster.profile_id),
    signups: signups ?? 0,
  };
}

const AVATAR_COLORS = ["#ffc23d", "#b9c1ec", "#ffb59f", "#9fe0bd", "#e3c8ff"];

function avatarColor(name: string) {
  let sum = 0;
  for (const char of name) sum += char.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
