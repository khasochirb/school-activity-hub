import Link from "next/link";
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
import {
  getPageParam,
  getSearchParam,
  pageRange,
  pageRows,
  postgrestSearchPattern,
} from "@/lib/list-filters";
import { formatDateTime } from "@/lib/i18n/date-format";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";
import {
  archiveClubRequest,
  approveClubRequest,
  rejectClubRequest,
  removeClubRequestSupport,
  supportClubRequest,
} from "./actions";
import { CreateClubRequestForm } from "./create-club-request-form";
import {
  CategoryBadge,
  CollapsibleFormSection,
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

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type ClubRequest = {
  id: string;
  category: string | null;
  converted_club_id: string | null;
  created_at: string;
  created_by_profile_id: string;
  description: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  status: "pending" | "approved" | "rejected" | "archived";
  title: string;
};

type ClubRequestSupport = {
  club_request_id: string;
  profile_id: string;
};

type ClubRequestsSearchParams = {
  category?: string | string[];
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
};

const CLUB_REQUESTS_PAGE_SIZE = 40;

export default async function ClubRequestsPage({
  searchParams,
}: {
  searchParams: Promise<ClubRequestsSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const params = await searchParams;
  const searchQuery = getSearchParam(params.q);
  const selectedCategory = parseActivityCategory(getSearchParam(params.category));
  const page = getPageParam(params.page);
  const range = pageRange(page, CLUB_REQUESTS_PAGE_SIZE);
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("club-requests.query.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer("club-requests.query.profile", () =>
    supabase
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .eq("status", "active")
      .maybeSingle<Profile>(),
  );

  if (!profile) {
    redirect("/dashboard");
  }

  const isStaff = profile.role === "school_admin" || profile.role === "teacher";
  const selectedStatus =
    parseRequestStatus(getSearchParam(params.status)) || (isStaff ? "pending" : "all");
  const categoryOptions = ACTIVITY_CATEGORIES.map((category) => ({
    label: categoryLabel(category, t),
    value: category,
  }));

  let requestsQuery = supabase
    .from("club_requests")
    .select(
      "id, title, description, category, status, rejection_reason, converted_club_id, created_by_profile_id, reviewed_at, created_at",
    )
    .eq("school_id", profile.school_id);

  if (selectedStatus !== "all") {
    requestsQuery = requestsQuery.eq("status", selectedStatus);
  }

  if (selectedCategory) {
    requestsQuery = requestsQuery.eq("category", selectedCategory);
  }

  if (searchQuery) {
    requestsQuery = requestsQuery.ilike("title", postgrestSearchPattern(searchQuery));
  }

  const activeStudentsCountPromise = isStaff
    ? timeServer("club-requests.query.active-students-count", () =>
        supabase
          .from("student_rosters")
          .select("id", { count: "exact", head: true })
          .eq("school_id", profile.school_id)
          .eq("status", "active"),
      )
    : Promise.resolve({ count: null, error: null });
  const [{ data: requests, error: requestsError }, activeStudentsResult] =
    await Promise.all([
      timeServer("club-requests.query.requests", () =>
        requestsQuery
          .order("created_at", { ascending: false })
          .range(range.from, range.to)
          .returns<ClubRequest[]>(),
      ),
      activeStudentsCountPromise,
    ]);

  if (requestsError) {
    console.error("Club requests query failed", {
      code: requestsError.code,
      details: requestsError.details,
      hint: requestsError.hint,
      message: requestsError.message,
    });
  }

  if (activeStudentsResult.error) {
    console.error("Club requests active student count query failed", {
      code: activeStudentsResult.error.code,
      details: activeStudentsResult.error.details,
      hint: activeStudentsResult.error.hint,
      message: activeStudentsResult.error.message,
    });
  }

  const { hasNextPage, rows: requestRows } = pageRows(
    requests,
    CLUB_REQUESTS_PAGE_SIZE,
  );
  const activeStudentCount = activeStudentsResult.count ?? 0;
  const requestIds = requestRows.map((request) => request.id);
  const { data: supports, error: supportsError } = requestIds.length
    ? await timeServer("club-requests.query.supports", () =>
        supabase
          .from("club_request_supports")
          .select("club_request_id, profile_id")
          .in("club_request_id", requestIds)
          .returns<ClubRequestSupport[]>(),
      )
    : { data: [], error: null };

  if (supportsError) {
    console.error("Club request supports query failed", {
      code: supportsError.code,
      details: supportsError.details,
      hint: supportsError.hint,
      message: supportsError.message,
    });
  }

  const creatorNamesById = isStaff
    ? await getCreatorNamesById(
        supabase,
        profile.school_id,
        requestRows.map((request) => request.created_by_profile_id),
      )
    : new Map<string, string>();
  const supportCounts = countSupportsByRequest(supports ?? []);
  const supportedRequestIds = new Set(
    (supports ?? [])
      .filter((support) => support.profile_id === profile.id)
      .map((support) => support.club_request_id),
  );
  const pageTitle = isStaff
    ? t("clubRequests.staffTitle")
    : t("clubRequests.studentTitle");
  const pageDescription = isStaff
    ? t("clubRequests.staffDescription")
    : t("clubRequests.studentDescription");

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          profile.role === "student" ? (
            <FormSectionToggleButton targetId="suggest-club">
              {t("clubRequests.actions.suggest")}
            </FormSectionToggleButton>
          ) : undefined
        }
        description={pageDescription}
        eyebrow={t("clubRequests.eyebrow")}
        title={pageTitle}
      />

      <section className="notice-box">
        {t("clubRequests.staffDecisionNotice")}
      </section>

      {profile.role === "student" ? (
        <CollapsibleFormSection
          description={t("clubRequests.create.description")}
          hideLabel={t("common.hideForm")}
          id="suggest-club"
          showLabel={t("common.showForm")}
          title={t("clubRequests.actions.submit")}
        >
          <CreateClubRequestForm
            categories={categoryOptions}
            labels={{
              category: t("clubRequests.fields.category"),
              description: t("clubRequests.fields.description"),
              noCategory: t("clubs.form.noCategory"),
              submit: t("clubRequests.actions.submit"),
              submitting: t("clubRequests.actions.submitting"),
              title: t("clubRequests.fields.title"),
            }}
          />
        </CollapsibleFormSection>
      ) : null}

      <FilterPanel
        action="/club-requests"
        clearHref="/club-requests"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: requestRows.length,
        })}
        submitLabel={t("filters.filter")}
      >
        <SearchField
          defaultValue={searchQuery}
          label={t("filters.search")}
          placeholder={t("clubRequests.filters.searchPlaceholder")}
        />
        <SelectFilter
          defaultValue={selectedCategory ?? ""}
          label={t("filters.category")}
          name="category"
          options={[
            { label: t("filters.all"), value: "" },
            ...categoryOptions,
          ]}
        />
        <SelectFilter
          defaultValue={selectedStatus}
          label={t("filters.status")}
          name="status"
          options={[
            { label: t("filters.all"), value: "all" },
            { label: t("clubRequests.status.pendingReview"), value: "pending" },
            { label: t("status.approved"), value: "approved" },
            { label: t("status.rejected"), value: "rejected" },
            { label: t("status.archived"), value: "archived" },
          ]}
        />
      </FilterPanel>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">
            {isStaff
              ? t("clubRequests.list.staffTitle")
              : t("clubRequests.list.studentTitle")}
          </h2>
        </div>
        {requestsError ? (
          <div className="p-4">
            <div className="notice-box notice-danger" role="status">
              {t("clubRequests.errors.loadFailed")}
            </div>
          </div>
        ) : requestRows.length ? (
          <div className="grid gap-3 p-3 lg:grid-cols-2">
            {requestRows.map((request) => {
              const supportCount = supportCounts.get(request.id) ?? 0;
              const supportRate = activeStudentCount
                ? Math.round((supportCount / activeStudentCount) * 100)
                : null;
              const isSupported = supportedRequestIds.has(request.id);

              return (
                <article
                  className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                  key={request.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-bold leading-snug text-slate-950">
                        {request.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {request.category ? (
                          <CategoryBadge>
                            {categoryLabel(request.category, t)}
                          </CategoryBadge>
                        ) : null}
                        <StatusBadge status={request.status}>
                          {requestStatusLabel(request.status, t)}
                        </StatusBadge>
                      </div>
                    </div>
                    <SupportSummary
                      labels={{
                        rate: t("clubRequests.fields.supportRate"),
                        supporters: t("clubRequests.fields.supporters"),
                      }}
                      supportCount={supportCount}
                      supportRate={supportRate}
                    />
                  </div>

                  {request.description ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {request.description}
                    </p>
                  ) : null}

                  <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    {isStaff ? (
                      <div>
                        <dt className="font-bold text-slate-800">
                          {t("clubRequests.fields.createdBy")}
                        </dt>
                        <dd>
                          {creatorNamesById.get(request.created_by_profile_id) ??
                            t("clubRequests.fallback.student")}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="font-bold text-slate-800">
                        {t("clubRequests.fields.createdAt")}
                      </dt>
                      <dd>{formatDateTime(request.created_at, locale)}</dd>
                    </div>
                    {request.reviewed_at ? (
                      <div>
                        <dt className="font-bold text-slate-800">
                          {t("clubRequests.fields.reviewedAt")}
                        </dt>
                        <dd>{formatDateTime(request.reviewed_at, locale)}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {request.status === "approved" ? (
                    <div className="notice-box notice-success mt-3">
                      <p className="font-bold">
                        {t("clubRequests.messages.approved")}
                      </p>
                      {request.converted_club_id ? (
                        <Link
                          className="mt-2 inline-flex cursor-pointer text-sm font-bold text-teal-700 hover:text-teal-800"
                          href={`/clubs?q=${encodeURIComponent(request.title)}`}
                        >
                          {t("clubRequests.messages.becameClub")}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  {request.status === "rejected" && request.rejection_reason ? (
                    <div className="notice-box notice-danger mt-3">
                      <p className="font-bold">
                        {t("clubRequests.fields.rejectionReason")}
                      </p>
                      <p>{request.rejection_reason}</p>
                    </div>
                  ) : null}

                  <ClubRequestActions
                    isStaff={isStaff}
                    isSupported={isSupported}
                    labels={{
                      approve: t("clubRequests.actions.approve"),
                      approving: t("clubRequests.actions.approving"),
                      archive: t("clubRequests.actions.archive"),
                      archiving: t("clubRequests.actions.archiving"),
                      reject: t("clubRequests.actions.reject"),
                      rejecting: t("clubRequests.actions.rejecting"),
                      rejectionReason: t("clubRequests.fields.rejectionReason"),
                      support: t("clubRequests.actions.support"),
                      supported: t("clubRequests.actions.supported"),
                      supporting: t("clubRequests.actions.supporting"),
                      unsupporting: t("clubRequests.actions.unsupporting"),
                    }}
                    profileRole={profile.role}
                    request={request}
                  />
                </article>
              );
            })}
          </div>
        ) : searchQuery || selectedCategory || selectedStatus !== (isStaff ? "pending" : "all") ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/club-requests"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              action={
                profile.role === "student" ? (
                  <FormSectionToggleButton targetId="suggest-club">
                    {t("clubRequests.actions.suggest")}
                  </FormSectionToggleButton>
                ) : undefined
              }
              description={
                profile.role === "student"
                  ? t("clubRequests.empty.studentDescription")
                  : t("clubRequests.empty.staffDescription")
              }
              title={
                profile.role === "student"
                  ? t("clubRequests.empty.studentTitle")
                  : t("clubRequests.empty.staffTitle")
              }
            />
          </div>
        )}
        {!requestsError && (requestRows.length > 0 || page > 1) ? (
          <PaginationControls
            getHref={(nextPage) =>
              clubRequestsPageHref(nextPage, {
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

function ClubRequestActions({
  isStaff,
  isSupported,
  labels,
  profileRole,
  request,
}: {
  isStaff: boolean;
  isSupported: boolean;
  labels: {
    approve: string;
    approving: string;
    archive: string;
    archiving: string;
    reject: string;
    rejecting: string;
    rejectionReason: string;
    support: string;
    supported: string;
    supporting: string;
    unsupporting: string;
  };
  profileRole: Profile["role"];
  request: ClubRequest;
}) {
  if (isStaff) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        {request.status === "pending" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <form action={approveClubRequest}>
              <input name="club_request_id" type="hidden" value={request.id} />
              <PendingSubmitButton
                className="btn btn-primary w-full sm:w-auto"
                pendingLabel={labels.approving}
                toastMessage={labels.approving}
              >
                {labels.approve}
              </PendingSubmitButton>
            </form>
            <form action={rejectClubRequest} className="grid gap-2 sm:flex sm:flex-wrap">
              <input name="club_request_id" type="hidden" value={request.id} />
              <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-slate-800 sm:w-64">
                {labels.rejectionReason}
                <input
                  className="h-10 rounded-md border px-3 text-base font-normal outline-none transition"
                  name="rejection_reason"
                />
              </label>
              <PendingSubmitButton
                className="btn btn-secondary h-10 w-full self-end sm:w-auto"
                pendingLabel={labels.rejecting}
                toastMessage={labels.rejecting}
              >
                {labels.reject}
              </PendingSubmitButton>
            </form>
          </div>
        ) : null}
        {request.status !== "archived" ? (
          <form action={archiveClubRequest}>
            <input name="club_request_id" type="hidden" value={request.id} />
            <PendingSubmitButton
              className="btn btn-secondary min-h-10 w-full sm:w-auto"
              pendingLabel={labels.archiving}
              toastMessage={labels.archiving}
            >
              {labels.archive}
            </PendingSubmitButton>
          </form>
        ) : null}
      </div>
    );
  }

  if (profileRole !== "student" || request.status !== "pending") {
    return null;
  }

  return (
    <form
      action={isSupported ? removeClubRequestSupport : supportClubRequest}
      className="mt-4"
    >
      <input name="club_request_id" type="hidden" value={request.id} />
      <PendingSubmitButton
        className={
          isSupported
            ? "btn btn-secondary min-h-12 w-full text-base sm:w-auto sm:text-sm"
            : "btn btn-primary min-h-12 w-full text-base sm:w-auto sm:text-sm"
        }
        pendingLabel={isSupported ? labels.unsupporting : labels.supporting}
        toastMessage={isSupported ? labels.unsupporting : labels.supporting}
      >
        {isSupported ? labels.supported : labels.support}
      </PendingSubmitButton>
    </form>
  );
}

function SupportSummary({
  labels,
  supportCount,
  supportRate,
}: {
  labels: {
    rate: string;
    supporters: string;
  };
  supportCount: number;
  supportRate: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 text-center sm:min-w-44">
      <div>
        <p className="text-lg font-black leading-none text-slate-950">
          {supportCount}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-500">{labels.supporters}</p>
      </div>
      <div>
        <p className="text-lg font-black leading-none text-slate-950">
          {supportRate === null ? "-" : `${supportRate}%`}
        </p>
        <p className="mt-1 text-xs font-bold text-slate-500">{labels.rate}</p>
      </div>
    </div>
  );
}

async function getCreatorNamesById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
  profileIds: string[],
) {
  const uniqueIds = [...new Set(profileIds)].filter(Boolean);

  if (!uniqueIds.length) {
    return new Map<string, string>();
  }

  const { data: profiles, error } = await timeServer("club-requests.query.creators", () =>
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("school_id", schoolId)
      .in("id", uniqueIds)
      .returns<Array<{ id: string; full_name: string }>>(),
  );

  if (error) {
    console.error("Club request creator profile query failed", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });
  }

  return new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
}

function countSupportsByRequest(supports: ClubRequestSupport[]) {
  const counts = new Map<string, number>();

  supports.forEach((support) => {
    counts.set(
      support.club_request_id,
      (counts.get(support.club_request_id) ?? 0) + 1,
    );
  });

  return counts;
}

function categoryLabel(category: string, t: (key: string) => string) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}

function requestStatusLabel(
  status: ClubRequest["status"],
  t: (key: string) => string,
) {
  if (status === "pending") {
    return t("clubRequests.status.pendingReview");
  }

  if (status === "approved") {
    return t("status.approved");
  }

  if (status === "rejected") {
    return t("status.rejected");
  }

  return t("status.archived");
}

function clubRequestsPageHref(
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

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/club-requests?${query}` : "/club-requests";
}

function parseRequestStatus(value: string) {
  return ["all", "pending", "approved", "rejected", "archived"].includes(value)
    ? value
    : "";
}
