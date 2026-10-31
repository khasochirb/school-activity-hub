import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  ACTIVITY_CATEGORIES,
  getActivityCategoryTranslationKey,
  parseActivityCategory,
} from "@/lib/activity-categories";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import {
  getPageParam,
  getSearchParam,
  pageRange,
  pageRows,
} from "@/lib/list-filters";
import { timeServer } from "@/lib/server-timing";
import { loadStudentInterests } from "@/lib/students/student-interests";
import {
  matchClubsToInterests,
  type ClubsForInterests,
} from "@/lib/students/student-journey";
import { createClient } from "@/lib/supabase/server";
import {
  archiveClub,
  assignClubLeader,
  joinClub,
  leaveClub,
} from "./actions";
import {
  CategoryBadge,
  CollapsibleFormSection,
  DetailsDisclosure,
  EmptyState,
  FilterPanel,
  FormSectionToggleButton,
  NoResultsState,
  PaginationControls,
  PageHeader,
  SearchField,
  SelectFilter,
  StatusBadge,
} from "../_components/page-ui";
import { CreateClubForm } from "./create-club-form";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type Club = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
};

type StudentRoster = {
  id: string;
};

type ClubPracticalDetails = {
  club_id: string;
  cost_notes: string | null;
  meeting_location: string | null;
  meeting_schedule: string | null;
};

type ClubMembership = {
  id: string;
  club_id: string;
  student_roster_id: string;
  role: "member" | "leader";
  student_rosters: {
    first_name: string;
    last_name: string;
  } | null;
};

type ClubsSearchParams = {
  category?: string | string[];
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
};

const CLUBS_PAGE_SIZE = 40;

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<ClubsSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const params = await searchParams;
  const searchQuery = getSearchParam(params.q);
  const selectedCategory = parseActivityCategory(getSearchValue(params.category));
  const page = getPageParam(params.page);
  const range = pageRange(page, CLUBS_PAGE_SIZE);
  const supabase = await createClient();
  const user = await timeServer("clubs.query.auth-get-user", () =>
    getCurrentUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer("clubs.query.profile", () =>
    supabase
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .maybeSingle<Profile>(),
  );

  if (!profile) {
    redirect("/dashboard");
  }

  const isStaff = profile.role === "school_admin" || profile.role === "teacher";
  const selectedStatus =
    isStaff ? parseClubStatus(getSearchParam(params.status)) || "active" : "active";

  let clubsQuery = supabase
    .from("clubs")
    .select("id, name, description, category, status")
    .eq("school_id", profile.school_id);

  if (selectedStatus !== "all") {
    clubsQuery = clubsQuery.eq("status", selectedStatus);
  }

  if (selectedCategory) {
    clubsQuery = clubsQuery.eq("category", selectedCategory);
  }

  if (searchQuery) {
    clubsQuery = clubsQuery.ilike("name", `%${searchQuery}%`);
  }

  const { data: clubs, error: clubsError } = await timeServer(
    "clubs.query.active-clubs",
    () =>
      clubsQuery
        .order("name", { ascending: true })
        .range(range.from, range.to)
        .returns<Club[]>(),
  );
  const { hasNextPage, rows: clubRows } = pageRows(clubs, CLUBS_PAGE_SIZE);

  const { data: currentStudent } =
    profile.role === "student"
      ? await timeServer("clubs.query.current-student", () =>
          supabase
            .from("student_rosters")
            .select("id")
            .eq("school_id", profile.school_id)
            .eq("profile_id", profile.id)
            .eq("status", "active")
            .maybeSingle<StudentRoster>(),
        )
      : { data: null };

  const clubIds = clubRows.map((club) => club.id);
  const { data: memberships } = clubIds.length
    ? await timeServer("clubs.query.active-memberships", () =>
        supabase
          .from("club_memberships")
          .select(
            "id, club_id, student_roster_id, role, student_rosters(first_name, last_name)",
          )
          .eq("school_id", profile.school_id)
          .eq("status", "active")
          .in("club_id", clubIds)
          .returns<ClubMembership[]>(),
      )
    : { data: [] };

  const isStudent = profile.role === "student";
  const hasActiveFilters = Boolean(searchQuery || selectedCategory || page > 1);
  const [studentInterests, schoolClubsResult] = isStudent
    ? await Promise.all([
        timeServer("clubs.query.student-interests", () =>
          loadStudentInterests(supabase, profile.id),
        ),
        hasActiveFilters
          ? Promise.resolve({ data: [] as Club[] })
          : timeServer("clubs.query.clubs-for-you", () =>
              supabase
                .from("clubs")
                .select("id, name, description, category, status")
                .eq("school_id", profile.school_id)
                .eq("status", "active")
                .returns<Club[]>(),
            ),
      ])
    : [null, { data: [] as Club[] }];
  const clubsForYou =
    studentInterests && !hasActiveFilters
      ? matchClubsToInterests(schoolClubsResult.data ?? [], studentInterests.interests)
      : null;
  const detailClubIds = Array.from(
    new Set([
      ...clubIds,
      ...(clubsForYou?.forYou.map(({ club }) => club.id) ?? []),
    ]),
  );
  const { data: practicalDetails } = detailClubIds.length
    ? await timeServer("clubs.query.practical-details", () =>
        supabase
          .from("club_profiles")
          .select("club_id, meeting_schedule, meeting_location, cost_notes")
          .in("club_id", detailClubIds)
          .returns<ClubPracticalDetails[]>(),
      )
    : { data: [] as ClubPracticalDetails[] };
  const detailsByClub = new Map(
    (practicalDetails ?? []).map((details) => [details.club_id, details]),
  );
  const membershipsByClub = groupMembershipsByClub(memberships ?? []);
  const currentStudentMemberships = new Set(
    (memberships ?? [])
      .filter((membership) => membership.student_roster_id === currentStudent?.id)
      .map((membership) => membership.club_id),
  );
  const categoryOptions = ACTIVITY_CATEGORIES.map((category) => ({
    label: categoryLabel(category, t),
    value: category,
  }));

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          isStaff ? (
            <FormSectionToggleButton targetId="create-club">
              {t("clubs.actions.create")}
            </FormSectionToggleButton>
          ) : undefined
        }
        description={t("clubs.description")}
        eyebrow={t("clubs.eyebrow")}
        title={t("clubs.title")}
      />

      {isStaff ? (
        <CollapsibleFormSection
          description={t("clubs.create.description")}
          hideLabel={t("common.hideForm")}
          id="create-club"
          showLabel={t("common.showForm")}
          title={t("clubs.actions.create")}
        >
          <CreateClubForm
            categories={categoryOptions}
            labels={{
              active: t("status.active"),
              archived: t("status.archived"),
              category: t("clubs.form.category"),
              create: t("clubs.actions.create"),
              creating: t("clubs.actions.creating"),
              description: t("clubs.form.description"),
              name: t("clubs.form.name"),
              noCategory: t("clubs.form.noCategory"),
              status: t("clubs.form.status"),
            }}
          />
        </CollapsibleFormSection>
      ) : null}

      {isStudent && studentInterests && clubsForYou ? (
        <ClubsForYouSection
          clubIdsWithKnownMembership={new Set(clubIds)}
          currentStudent={currentStudent ?? null}
          currentStudentMemberships={currentStudentMemberships}
          detailsByClub={detailsByClub}
          interestsAvailable={studentInterests.available}
          matches={clubsForYou}
          t={t}
          tf={tf}
        />
      ) : null}

      <FilterPanel
        action="/clubs"
        clearHref="/clubs"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: clubRows.length,
        })}
        submitLabel={t("filters.filter")}
      >
        <SearchField
          defaultValue={searchQuery}
          label={t("filters.search")}
          placeholder={t("filters.searchClubs")}
        />
        <SelectFilter
          defaultValue={selectedCategory ?? ""}
          label={t("filters.category")}
          name="category"
          options={[
            { label: t("filters.all"), value: "" },
            ...ACTIVITY_CATEGORIES.map((category) => ({
              label: categoryLabel(category, t),
              value: category,
            })),
          ]}
        />
        {isStaff ? (
          <SelectFilter
            defaultValue={selectedStatus}
            label={t("filters.status")}
            name="status"
            options={[
              { label: t("filters.all"), value: "all" },
              { label: t("status.active"), value: "active" },
              { label: t("status.archived"), value: "archived" },
            ]}
          />
        ) : null}
      </FilterPanel>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">{t("clubs.active.title")}</h2>
          {clubsError ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("clubs.errors.loadFailed", {
                error: t("common.somethingWentWrong"),
              })}
            </p>
          ) : null}
          {profile.role === "student" && !currentStudent ? (
            <p className="mt-2 text-sm text-zinc-600">
              {t("clubs.student.noRosterWarning")}
            </p>
          ) : null}
        </div>
        {clubRows.length ? (
          <div className="grid gap-3 p-3 md:grid-cols-2">
            {clubRows.map((club) => {
              const clubMemberships = membershipsByClub.get(club.id) ?? [];
              const isJoined = currentStudentMemberships.has(club.id);
              const isStudentView = profile.role === "student";

              return (
                <article
                  className={
                    isStudentView
                      ? "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                      : "rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                  }
                  key={club.id}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className={isStudentView ? "text-xl font-semibold text-zinc-950" : "text-lg font-semibold text-zinc-950"}>
                        <Link
                          aria-label={tf("clubs.profile.actions.viewNamedClub", {
                            club: club.name,
                          })}
                          className="inline-flex min-w-0 items-center gap-2 break-words hover:text-[var(--primary-strong)]"
                          href={`/clubs/${club.id}`}
                          prefetch={false}
                        >
                          <span className="break-words">{club.name}</span>
                          <PendingLinkIndicator />
                        </Link>
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {club.category ? (
                          <CategoryBadge category={club.category}>
                            {categoryLabel(club.category, t)}
                          </CategoryBadge>
                        ) : null}
                        <StatusBadge status={club.status}>
                          {statusLabel(club.status, t)}
                        </StatusBadge>
                        {isStudentView && isJoined ? (
                          <StatusBadge variant="success">
                            {t("clubs.memberRoles.member")}
                          </StatusBadge>
                        ) : null}
                      </div>
                    </div>
                    <ClubActions
                      club={club}
                      currentStudent={currentStudent}
                      isJoined={isJoined}
                      isStaff={isStaff}
                      labels={{
                        archive: t("clubs.actions.archive"),
                        archived: t("status.archived"),
                        archiving: t("clubs.actions.archiving"),
                        cancel: t("common.cancel"),
                        confirm: t("feedback.confirm"),
                        confirmArchive: t("feedback.archiveClub"),
                        confirmDescription: t("feedback.cannotBeUndone"),
                        join: t("clubs.actions.join"),
                        joining: t("clubs.actions.joining"),
                        leave: t("clubs.actions.leave"),
                        leaving: t("clubs.actions.leaving"),
                      }}
                      role={profile.role}
                    />
                  </div>
                  {club.description ? (
                    <p className="mt-3 text-base leading-7 text-zinc-600 sm:text-sm sm:leading-6">
                      {club.description}
                    </p>
                  ) : null}
                  <ClubPracticalFacts
                    details={detailsByClub.get(club.id)}
                    t={t}
                  />
                  {isStaff ? (
                    <DetailsDisclosure label={t("common.viewDetails")}>
                      <h4 className="text-sm font-medium text-zinc-950">
                        {t("clubs.members.title")}
                      </h4>
                      {clubMemberships.length ? (
                        <ul className="mt-2 flex flex-col gap-2">
                          {clubMemberships.map((membership) => (
                            <li
                              className="flex flex-col gap-2 rounded-md bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                              key={membership.id}
                            >
                              <div>
                                <p className="text-sm font-medium text-zinc-900">
                                  {memberName(
                                    membership,
                                    t("clubs.fallback.rosterStudent"),
                                  )}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {memberRoleLabel(membership.role, t)}
                                </p>
                              </div>
                              {membership.role !== "leader" ? (
                                <form action={assignClubLeader}>
                                  <input
                                    name="membership_id"
                                    type="hidden"
                                    value={membership.id}
                                  />
                                  <PendingSubmitButton
                                    className="btn btn-secondary min-h-9 px-3"
                                    pendingLabel={t("common.saving")}
                                    toastMessage={t("common.saving")}
                                  >
                                    {t("clubs.actions.makeLeader")}
                                  </PendingSubmitButton>
                                </form>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-600">
                          {t("clubs.members.empty")}
                        </p>
                      )}
                    </DetailsDisclosure>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : searchQuery || selectedCategory || selectedStatus !== "active" ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/clubs"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              action={
                isStaff ? (
                  <FormSectionToggleButton targetId="create-club">
                    {t("clubs.actions.create")}
                  </FormSectionToggleButton>
                ) : undefined
              }
              description={
                isStaff
                  ? t("clubs.empty.staffDescription")
                  : t("clubs.empty.studentDescription")
              }
              title={t("clubs.empty.title")}
            />
          </div>
        )}
        {!clubsError && (clubRows.length > 0 || page > 1) ? (
          <PaginationControls
            getHref={(nextPage) =>
              clubsPageHref(nextPage, {
                category: selectedCategory ?? "",
                q: searchQuery,
                status: selectedStatus,
              })
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
  );
}

function ClubActions({
  club,
  currentStudent,
  isJoined,
  isStaff,
  labels,
  role,
}: {
  club: Club;
  currentStudent: StudentRoster | null;
  isJoined: boolean;
  isStaff: boolean;
  labels: {
    archive: string;
    archived: string;
    archiving: string;
    cancel: string;
    confirm: string;
    confirmArchive: string;
    confirmDescription: string;
    join: string;
    joining: string;
    leave: string;
    leaving: string;
  };
  role: Profile["role"];
}) {
  if (isStaff) {
    if (club.status !== "active") {
      return <span className="text-sm text-zinc-500">{labels.archived}</span>;
    }

    return (
      <form action={archiveClub}>
        <input name="club_id" type="hidden" value={club.id} />
        <ConfirmSubmitButton
          cancelLabel={labels.cancel}
          className="btn btn-secondary min-h-9 px-3"
          confirmDescription={labels.confirmDescription}
          confirmLabel={labels.confirm}
          confirmTitle={labels.confirmArchive}
          pendingLabel={labels.archiving}
        >
          {labels.archive}
        </ConfirmSubmitButton>
      </form>
    );
  }

  if (role !== "student" || !currentStudent) {
    return null;
  }

  return (
    <form action={isJoined ? leaveClub : joinClub} className="w-full sm:w-auto">
      <input name="club_id" type="hidden" value={club.id} />
      <PendingSubmitButton
        className={
          isJoined
            ? "btn btn-secondary min-h-12 w-full px-4 text-base sm:min-h-10 sm:w-auto sm:text-sm"
            : "btn btn-primary min-h-12 w-full px-4 text-base sm:min-h-10 sm:w-auto sm:text-sm"
        }
        pendingLabel={isJoined ? labels.leaving : labels.joining}
        toastMessage={isJoined ? labels.leaving : labels.joining}
      >
        {isJoined ? labels.leave : labels.join}
      </PendingSubmitButton>
    </form>
  );
}

function ClubsForYouSection({
  clubIdsWithKnownMembership,
  currentStudent,
  currentStudentMemberships,
  detailsByClub,
  interestsAvailable,
  matches,
  t,
  tf,
}: {
  clubIdsWithKnownMembership: Set<string>;
  currentStudent: StudentRoster | null;
  currentStudentMemberships: Set<string>;
  detailsByClub: Map<string, ClubPracticalDetails>;
  interestsAvailable: boolean;
  matches: ClubsForInterests<Club>;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  const hasInterests =
    matches.forYou.length > 0 || matches.interestsWithoutClubs.length > 0;

  if (!hasInterests) {
    if (!interestsAvailable) {
      return null;
    }

    return (
      <section className="section-card section-card-padded flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="section-title">{t("studentProfile.clubsForYou.promptTitle")}</h2>
          <p className="section-description">
            {t("studentProfile.clubsForYou.promptDescription")}
          </p>
        </div>
        <Link
          className="btn btn-primary min-h-12 w-full px-5 text-base sm:min-h-10 sm:w-auto sm:text-sm"
          href="/profile/interests?from=clubs"
          prefetch={false}
        >
          {t("studentProfile.interests.pick")}
        </Link>
      </section>
    );
  }

  return (
    <section className="section-card">
      <div className="section-header flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">{t("studentProfile.clubsForYou.title")}</h2>
        <Link
          className="text-sm font-semibold text-[var(--primary-strong)] hover:underline"
          href="/profile/interests?from=clubs"
          prefetch={false}
        >
          {t("studentProfile.interests.edit")}
        </Link>
      </div>
      {matches.forYou.length ? (
        <div className="grid gap-3 p-3 md:grid-cols-2">
          {matches.forYou.map(({ club, matchedInterest }) => {
            const membershipKnown = clubIdsWithKnownMembership.has(club.id);
            const isJoined = currentStudentMemberships.has(club.id);

            return (
              <article
                className="rounded-xl border border-[var(--primary-border)] bg-white p-4 shadow-sm"
                key={club.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-zinc-950">
                      <Link
                        className="break-words hover:text-[var(--primary-strong)]"
                        href={`/clubs/${club.id}`}
                        prefetch={false}
                      >
                        {club.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {tf("studentProfile.clubsForYou.reason", {
                        interest: categoryLabel(matchedInterest, t),
                      })}
                    </p>
                  </div>
                  {isJoined ? (
                    <StatusBadge variant="success">
                      {t("clubs.memberRoles.member")}
                    </StatusBadge>
                  ) : currentStudent && membershipKnown ? (
                    <form action={joinClub} className="w-full sm:w-auto">
                      <input name="club_id" type="hidden" value={club.id} />
                      <PendingSubmitButton
                        className="btn btn-primary min-h-12 w-full px-4 text-base sm:min-h-10 sm:w-auto sm:text-sm"
                        pendingLabel={t("clubs.actions.joining")}
                        toastMessage={t("clubs.actions.joining")}
                      >
                        {t("clubs.actions.join")}
                      </PendingSubmitButton>
                    </form>
                  ) : null}
                </div>
                <ClubPracticalFacts details={detailsByClub.get(club.id)} t={t} />
              </article>
            );
          })}
        </div>
      ) : null}
      {matches.interestsWithoutClubs.length ? (
        <ul className="flex flex-col gap-2 p-3 pt-0">
          {matches.interestsWithoutClubs.map((interest) => (
            <li
              className="flex flex-col gap-2 rounded-md border border-dashed border-[var(--border-strong)] p-3 sm:flex-row sm:items-center sm:justify-between"
              key={interest}
            >
              <span className="text-sm text-zinc-700">
                {tf("studentProfile.clubsForYou.noClubYet", {
                  interest: categoryLabel(interest, t),
                })}
              </span>
              <Link
                className="btn btn-secondary min-h-10 px-3 text-sm"
                href="/club-requests"
                prefetch={false}
              >
                {t("studentProfile.clubsForYou.propose")}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ClubPracticalFacts({
  details,
  t,
}: {
  details: ClubPracticalDetails | undefined;
  t: (key: string) => string;
}) {
  const facts = [
    { label: t("studentProfile.clubFacts.when"), value: details?.meeting_schedule },
    { label: t("studentProfile.clubFacts.where"), value: details?.meeting_location },
    { label: t("studentProfile.clubFacts.cost"), value: details?.cost_notes },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));

  if (!facts.length) {
    return null;
  }

  return (
    <dl className="mt-3 grid gap-1 text-sm">
      {facts.map((fact) => (
        <div className="flex gap-2" key={fact.label}>
          <dt className="shrink-0 font-semibold text-zinc-700">{fact.label}</dt>
          <dd className="min-w-0 break-words text-zinc-600">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function groupMembershipsByClub(memberships: ClubMembership[]) {
  const grouped = new Map<string, ClubMembership[]>();

  memberships.forEach((membership) => {
    const clubMemberships = grouped.get(membership.club_id) ?? [];
    clubMemberships.push(membership);
    grouped.set(membership.club_id, clubMemberships);
  });

  return grouped;
}

function memberName(membership: ClubMembership, fallbackName: string) {
  const student = membership.student_rosters;

  if (!student) {
    return fallbackName;
  }

  return `${student.first_name} ${student.last_name}`;
}

function memberRoleLabel(
  role: ClubMembership["role"],
  t: (key: string) => string,
) {
  if (role === "leader") {
    return t("clubs.memberRoles.leader");
  }

  return t("clubs.memberRoles.member");
}

function categoryLabel(category: string, t: (key: string) => string) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}

function clubsPageHref(
  page: number,
  filters: { category: string; q: string; status: string },
) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.status && filters.status !== "active") {
    params.set("status", filters.status);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/clubs?${query}` : "/clubs";
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === "active") {
    return t("status.active");
  }

  if (status === "archived") {
    return t("status.archived");
  }

  return status;
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseClubStatus(value: string) {
  return ["active", "archived", "all"].includes(value) ? value : "";
}
