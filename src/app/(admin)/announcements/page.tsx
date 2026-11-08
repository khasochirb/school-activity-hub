import { redirect } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import Link from "next/link";
import { formatCalendarDateBadge, formatDate, formatTime } from "@/lib/i18n/date-format";
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
  FormSectionToggleButton,
  NoResultsState,
  PaginationControls,
} from "../_components/page-ui";
import { archiveAnnouncement } from "./actions";
import { PageHead, Widget } from "../_components/clean-ui";
import { CreateAnnouncementForm } from "./create-announcement-form";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
  status: "active" | "inactive";
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
      .select("id, school_id, role, status")
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
  const [counts, upcoming] = await Promise.all([
    getAnnouncementCounts(supabase, profile.school_id),
    getUpcomingEvents(supabase, profile.school_id),
  ]);
  const featured =
    !hasFilters && page === 1 ? filteredAnnouncements.find((item) => item.status === "active") ?? null : null;
  const rows = filteredAnnouncements.filter((item) => item.id !== featured?.id);

  return (
    <div className="cl-page">
      <PageHead
        action={
          isStaff ? (
            <FormSectionToggleButton targetId="create-announcement">
              + {t("announcements.actions.create")}
            </FormSectionToggleButton>
          ) : undefined
        }
        subtitle={tf("announcements.page.subtitle", { count: counts.active })}
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

      <div className="cl-filters">
        {isStaff
          ? ([
              ["active", `${t("status.active")} · ${counts.active}`],
              ["archived", `${t("status.archived")} · ${counts.archived}`],
              ["", t("filters.all")],
            ] as const).map(([value, label]) => (
              <Link
                aria-current={selectedStatus === value ? "page" : undefined}
                className="cl-chip"
                href={announcementsPageHref(1, searchQuery, value)}
                key={value || "all"}
                prefetch={false}
              >
                {label}
              </Link>
            ))
          : null}
        <form action="/announcements" className="cl-search" role="search">
          <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="sr-only">{t("filters.search")}</span>
          <input defaultValue={searchQuery} name="q" placeholder={t("filters.searchAnnouncements")} type="search" />
          {isStaff && selectedStatus ? <input name="status" type="hidden" value={selectedStatus} /> : null}
        </form>
      </div>

      <div className="cl-split">
      <div className="cl-main">
      {featured ? (
        <article className="cl-card cl-featured">
          <small>
            {t("announcements.page.latest")} · {formatDate(featured.created_at, locale)}
          </small>
          <h2>{featured.title}</h2>
          <p>{featured.body}</p>
        </article>
      ) : null}

      <section className="cl-sec">
        <header>
          <h2>
            {isStaff
              ? t("announcements.list.staffTitle")
              : t("announcements.list.studentTitle")}
          </h2>
        </header>
        {error ? (
          <p className="notice-box notice-warning">
            {tf("announcements.errors.loadFailed", {
              error: t("common.somethingWentWrong"),
            })}
          </p>
        ) : null}
        {announcementList.length && filteredAnnouncements.length ? (
          rows.length ? (
          <div className="cl-card cl-rows">
            {rows.map((announcement) => {
              const tile = formatCalendarDateBadge(announcement.created_at, locale);

              return (
                <article className="cl-row items-start" key={announcement.id}>
                  <span aria-hidden="true" className="cl-dtile">
                    <span>{tile.month}</span>
                    <b>{Number(tile.day)}</b>
                  </span>
                  <span className="cl-grow">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="cl-row-title">{announcement.title}</span>
                      <span className="cl-tag" data-tone={announcement.status === "active" ? "ok" : undefined}>
                        {statusLabel(announcement.status, t)}
                      </span>
                    </span>
                    <details className="cl-more">
                      <summary>
                        <span className="cl-row-sub line-clamp-2">{announcement.body}</span>
                        <span className="cl-more-link">{t("common.viewDetails")}</span>
                      </summary>
                      <p className="mt-1 whitespace-pre-line text-sm leading-6">{announcement.body}</p>
                    </details>
                  </span>
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
                </article>
              );
            })}
          </div>
          ) : null
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

      <aside className="cl-side">
        <Widget title={t("announcements.page.glance")}>
          <p className="cl-statline">
            <span>
              <b>{counts.active}</b>
              {t("status.active")}
            </span>
            <span>
              <b>{counts.archived}</b>
              {t("status.archived")}
            </span>
          </p>
        </Widget>
        <Widget
          link={{ href: "/events", label: t("dashboard.home.allEvents") }}
          title={t("announcements.page.comingUp")}
        >
          {upcoming.length ? (
            upcoming.map((event) => {
              const tile = formatCalendarDateBadge(event.starts_at, locale);

              return (
                <Link
                  className="flex items-center gap-3 rounded-lg py-1 hover:bg-[var(--cl-hover)]"
                  href={`/events/${event.id}`}
                  key={event.id}
                  prefetch={false}
                >
                  <span className="w-10 flex-none text-center">
                    <span className="block text-[11px] font-semibold uppercase text-[var(--muted)]">
                      {tile.month}
                    </span>
                    <b className="block text-base leading-tight">{Number(tile.day)}</b>
                  </span>
                  <span className="cl-grow">
                    <span className="cl-row-title text-sm">{event.title}</span>
                    <span className="cl-row-sub text-[13px]">
                      {formatTime(event.starts_at, locale)}
                      {event.location ? ` · ${event.location}` : ""}
                    </span>
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-[var(--muted)]">{t("dashboard.upcoming.emptyTitle")}</p>
          )}
        </Widget>
      </aside>
      </div>
    </div>
  );
}

async function getAnnouncementCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
) {
  const [active, archived] = await Promise.all(
    ["active", "archived"].map((status) =>
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("status", status),
    ),
  );

  return { active: active.count ?? 0, archived: archived.count ?? 0 };
}

async function getUpcomingEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string,
) {
  const { data } = await supabase
    .from("events")
    .select("id, title, starts_at, location")
    .eq("school_id", schoolId)
    .eq("status", "approved")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(3)
    .returns<Array<{ id: string; location: string | null; starts_at: string; title: string }>>();

  return data ?? [];
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
        className="btn btn-quiet min-h-9 px-3"
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
  return (
    profile.status === "active" &&
    (profile.role === "school_admin" || profile.role === "teacher")
  );
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
