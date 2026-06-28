import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
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
import { getSearchParam } from "@/lib/list-filters";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";
import {
  archiveClub,
  assignClubLeader,
  joinClub,
  leaveClub,
} from "./actions";
import {
  CategoryBadge,
  EmptyState,
  FilterPanel,
  HeaderActionLink,
  NoResultsState,
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
  q?: string | string[];
  status?: string | string[];
};

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("clubs.query.auth-get-user", () =>
    supabase.auth.getUser(),
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
    () => clubsQuery.order("name", { ascending: true }).returns<Club[]>(),
  );

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

  const clubIds = (clubs ?? []).map((club) => club.id);
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
            <HeaderActionLink href="#create-club">
              {t("clubs.actions.create")}
            </HeaderActionLink>
          ) : undefined
        }
        description={t("clubs.description")}
        eyebrow={t("clubs.eyebrow")}
        title={t("clubs.title")}
      />

      {isStaff ? (
        <section className="section-card section-card-padded" id="create-club">
          <h2 className="section-title">{t("clubs.actions.create")}</h2>
          <p className="section-description">
            {t("clubs.create.description")}
          </p>
          <div className="mt-4">
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
          </div>
        </section>
      ) : null}

      <FilterPanel
        action="/clubs"
        clearHref="/clubs"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: clubs?.length ?? 0,
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
              {tf("clubs.errors.loadFailed", { error: clubsError.message })}
            </p>
          ) : null}
          {profile.role === "student" && !currentStudent ? (
            <p className="mt-2 text-sm text-zinc-600">
              {t("clubs.student.noRosterWarning")}
            </p>
          ) : null}
        </div>
        {clubs?.length ? (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {clubs.map((club) => {
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
                        {club.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {club.category ? (
                          <CategoryBadge>
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
                  {isStaff ? (
                    <div className="mt-4 border-t border-zinc-200 pt-4">
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
                    </div>
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
                  <HeaderActionLink href="#create-club">
                    {t("clubs.actions.create")}
                  </HeaderActionLink>
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
        <PendingSubmitButton
          className="btn btn-secondary min-h-9 px-3"
          pendingLabel={labels.archiving}
        >
          {labels.archive}
        </PendingSubmitButton>
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
      >
        {isJoined ? labels.leave : labels.join}
      </PendingSubmitButton>
    </form>
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
