import { redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDateTime } from "@/lib/i18n/date-format";
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
import { createClient } from "@/lib/supabase/server";
import {
  CollapsibleFormSection,
  EmptyState,
  DetailsDisclosure,
  FilterPanel,
  FormSectionToggleButton,
  NoResultsState,
  PaginationControls,
  PageHeader,
  SearchField,
  SelectFilter,
  StatusBadge,
} from "../_components/page-ui";
import { archiveAnnouncement } from "./actions";
import { CreateAnnouncementForm } from "./create-announcement-form";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

type AnnouncementsSearchParams = {
  page?: string | string[];
  q?: string | string[];
  status?: string | string[];
};

const ANNOUNCEMENTS_PAGE_SIZE = 30;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<AnnouncementsSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const params = await searchParams;
  const searchQuery = getSearchParam(params.q);
  const selectedStatus = parseAnnouncementStatus(getSearchParam(params.status));
  const page = getPageParam(params.page);
  const range = pageRange(page, ANNOUNCEMENTS_PAGE_SIZE);
  const supabase = await createClient();
  const user = await timeServer("announcements.query.auth-get-user", () =>
    getCurrentUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer("announcements.query.profile", () =>
    supabase
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .maybeSingle<Profile>(),
  );

  if (!profile) {
    redirect("/dashboard");
  }

  const isStaff = isSchoolStaff(profile);
  let announcementsQuery = supabase
    .from("announcements")
    .select("id, title, body, status, created_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (!isStaff) {
    announcementsQuery = announcementsQuery.eq("status", "active");
  } else if (selectedStatus) {
    announcementsQuery = announcementsQuery.eq("status", selectedStatus);
  }

  const searchPattern = postgrestSearchPattern(searchQuery);

  if (searchPattern) {
    announcementsQuery = announcementsQuery.ilike("title", searchPattern);
  }

  const { data: announcements, error } = await timeServer(
    "announcements.query.list",
    () =>
      announcementsQuery
        .range(range.from, range.to)
        .returns<Announcement[]>(),
  );
  const { hasNextPage, rows: announcementList } = pageRows(
    announcements,
    ANNOUNCEMENTS_PAGE_SIZE,
  );
  const filteredAnnouncements = announcementList.filter(
    (announcement) =>
      matchesSearch(searchQuery, [announcement.title]),
  );
  const hasFilters = Boolean(searchQuery || (isStaff && selectedStatus));

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          isStaff ? (
            <FormSectionToggleButton targetId="create-announcement">
              {t("announcements.actions.create")}
            </FormSectionToggleButton>
          ) : undefined
        }
        description={t("announcements.description")}
        eyebrow={t("announcements.eyebrow")}
        title={t("announcements.title")}
      />

      {isStaff ? (
        <CollapsibleFormSection
          description={t("announcements.create.description")}
          hideLabel={t("common.hideForm")}
          id="create-announcement"
          showLabel={t("common.showForm")}
          title={t("announcements.create.title")}
        >
          <CreateAnnouncementForm
            labels={{
              active: t("status.active"),
              archived: t("status.archived"),
              body: t("announcements.form.body"),
              create: t("announcements.actions.create"),
              posting: t("announcements.actions.posting"),
              status: t("announcements.form.status"),
              title: t("announcements.form.title"),
            }}
          />
        </CollapsibleFormSection>
      ) : null}

      <FilterPanel
        action="/announcements"
        clearHref="/announcements"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: filteredAnnouncements.length,
        })}
        submitLabel={t("filters.filter")}
      >
        <SearchField
          defaultValue={searchQuery}
          label={t("filters.search")}
          placeholder={t("filters.searchAnnouncements")}
        />
        {isStaff ? (
          <SelectFilter
            defaultValue={selectedStatus}
            label={t("filters.status")}
            name="status"
            options={[
              { label: t("filters.all"), value: "" },
              { label: t("status.active"), value: "active" },
              { label: t("status.archived"), value: "archived" },
            ]}
          />
        ) : null}
      </FilterPanel>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">
            {isStaff
              ? t("announcements.list.staffTitle")
              : t("announcements.list.studentTitle")}
          </h2>
          {error ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("announcements.errors.loadFailed", {
                error: error.message,
              })}
            </p>
          ) : null}
        </div>
        {announcementList.length && filteredAnnouncements.length ? (
          <div className="grid gap-3 p-3">
            {filteredAnnouncements.map((announcement) => (
              <article
                className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                key={announcement.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-950">
                      {announcement.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {formatDateTime(announcement.created_at, locale)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={announcement.status}>
                      {statusLabel(announcement.status, t)}
                    </StatusBadge>
                    {isStaff ? (
                      <ArchiveForm
                        announcement={announcement}
                        labels={{
                          archive: t("announcements.actions.archive"),
                          archiving: t("announcements.actions.archiving"),
                          cancel: t("common.cancel"),
                          confirm: t("feedback.confirm"),
                          confirmDescription: t("feedback.cannotBeUndone"),
                        }}
                      />
                    ) : null}
                  </div>
                </div>
                <DetailsDisclosure label={t("common.viewDetails")}>
                  <p className="whitespace-pre-line text-sm leading-6 text-zinc-700">
                    {announcement.body}
                  </p>
                </DetailsDisclosure>
              </article>
            ))}
          </div>
        ) : announcementList.length && hasFilters ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/announcements"
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
                  <FormSectionToggleButton targetId="create-announcement">
                    {t("announcements.actions.create")}
                  </FormSectionToggleButton>
                ) : undefined
              }
              description={
                isStaff
                  ? t("announcements.empty.staffDescription")
                  : t("announcements.empty.studentDescription")
              }
              title={t("announcements.empty.title")}
            />
          </div>
        )}
        {!error && (filteredAnnouncements.length > 0 || page > 1) ? (
          <PaginationControls
            getHref={(nextPage) =>
              announcementsPageHref(
                nextPage,
                searchQuery,
                isStaff ? selectedStatus : "",
              )
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

function ArchiveForm({
  announcement,
  labels,
}: {
  announcement: Announcement;
  labels: {
    archive: string;
    archiving: string;
    cancel: string;
    confirm: string;
    confirmDescription: string;
  };
}) {
  if (announcement.status !== "active") {
    return null;
  }

  return (
    <form action={archiveAnnouncement}>
      <input name="announcement_id" type="hidden" value={announcement.id} />
      <ConfirmSubmitButton
        cancelLabel={labels.cancel}
        className="btn btn-secondary min-h-9 px-3"
        confirmDescription={labels.confirmDescription}
        confirmLabel={labels.confirm}
        confirmTitle={labels.archive}
        pendingLabel={labels.archiving}
      >
        {labels.archive}
      </ConfirmSubmitButton>
    </form>
  );
}

function isSchoolStaff(profile: Profile) {
  return profile.role === "school_admin" || profile.role === "teacher";
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

function parseAnnouncementStatus(value: string) {
  return value === "active" || value === "archived" ? value : "";
}

function announcementsPageHref(
  page: number,
  searchQuery: string,
  selectedStatus: string,
) {
  const params = new URLSearchParams();

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

  return query ? `/announcements?${query}` : "/announcements";
}
