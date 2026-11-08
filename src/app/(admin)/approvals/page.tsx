import { redirect } from "next/navigation";
import { getCurrentEventActor, isEventStaffActor } from "@/lib/auth/event-access";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  EventCompletenessBadge,
  type EventCompletenessLabels,
} from "@/components/events/event-listing-completeness";
import { getActivityCategoryTranslationKey } from "@/lib/activity-categories";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import {
  formatDate,
  formatDateTime,
  formatTime,
} from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { EventExperienceLevel } from "@/lib/events/event-decision-info";
import {
  formatEventCost,
  type EventCostType,
} from "@/lib/events/event-practical-details";
import { EVENT_APPROVAL_SELECT } from "@/lib/events/event-selects";
import { getEventListingCompleteness } from "@/lib/events/event-listing-completeness";
import { getSearchParam, matchesSearch } from "@/lib/list-filters";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  NoResultsState,
} from "../_components/page-ui";
import Link from "next/link";
import { CategoryLabel, Cover, initialsOf, PageHead } from "../_components/clean-ui";
import { approveEvent, rejectEvent } from "./actions";

type PendingEvent = {
  id: string;
  school_id: string;
  club_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  risk_level: "low" | "medium" | "high";
  permission_required: boolean;
  permission_note: string | null;
  responsible_staff_id: string | null;
  eligibility_notes: string | null;
  experience_level: EventExperienceLevel | null;
  accessibility_notes: string | null;
  cost_type: EventCostType | null;
  cost_amount: number | string | null;
  cost_currency: string | null;
  cost_notes: string | null;
  required_materials: string | null;
  expected_commitment: string | null;
  cancellation_notice: string | null;
  submitted_at: string | null;
  created_at: string;
};

type Club = {
  id: string;
  name: string;
};

type School = {
  id: string;
  name: string;
};

type ResponsibleStaffProfile = {
  full_name: string;
  id: string;
  role: "school_admin" | "teacher";
  status: "active" | "inactive";
};

type Translate = (key: string) => string;

type ApprovalsSearchParams = {
  q?: string | string[];
  selected?: string | string[];
};

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<ApprovalsSearchParams>;
}) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const completenessLabels: EventCompletenessLabels = {
    detailsCompleted: t("events.completeness.detailsCompleted"),
    listingCompleteness: t("events.completeness.listingCompleteness"),
    missingInformation: t("events.completeness.missingInformation"),
    needsMoreDetails: t("events.completeness.needsMoreDetails"),
    readyToPublish: t("events.completeness.readyToPublish"),
  };
  const params = await searchParams;
  const searchQuery = getSearchParam(params.q);
  const supabase = await createClient();
  const actor = await getCurrentEventActor();

  if (!actor) {
    redirect("/login");
  }
  if (!isEventStaffActor(actor)) {
    redirect("/dashboard");
  }

  let eventsQuery = supabase
    .from("events")
    .select(EVENT_APPROVAL_SELECT)
    .eq("status", "pending_approval");
  if (!actor.isPlatformAdmin && actor.profile) {
    eventsQuery = eventsQuery.eq("school_id", actor.profile.school_id);
  }
  const { data: pendingEvents, error: eventsError } = await eventsQuery
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .returns<PendingEvent[]>();
  const clubIds = Array.from(
    new Set(
      (pendingEvents ?? [])
        .map((event) => event.club_id)
        .filter((clubId): clubId is string => Boolean(clubId)),
    ),
  );
  const responsibleStaffIds = Array.from(
    new Set(
      (pendingEvents ?? [])
        .map((event) => event.responsible_staff_id)
        .filter((staffId): staffId is string => Boolean(staffId)),
    ),
  );
  const schoolIds = Array.from(
    new Set((pendingEvents ?? []).map((event) => event.school_id)),
  );
  const lookupClient = actor.isPlatformAdmin ? createAdminClient() : supabase;
  const [{ data: clubs }, { data: responsibleStaff }, { data: schools }] = await Promise.all([
    clubIds.length
      ? lookupClient
          .from("clubs")
          .select("id, name")
          .in("id", clubIds)
          .returns<Club[]>()
      : Promise.resolve({ data: [] as Club[] }),
    responsibleStaffIds.length
      ? lookupClient
          .from("profiles")
          .select("id, full_name, role, status")
          .in("id", responsibleStaffIds)
          .in("role", ["school_admin", "teacher"])
          .returns<ResponsibleStaffProfile[]>()
      : Promise.resolve({ data: [] as ResponsibleStaffProfile[] }),
    actor.isPlatformAdmin && schoolIds.length
      ? lookupClient
          .from("schools")
          .select("id, name")
          .in("id", schoolIds)
          .returns<School[]>()
      : Promise.resolve({ data: [] as School[] }),
  ]);

  const clubNameById = new Map((clubs ?? []).map((club) => [club.id, club.name]));
  const responsibleStaffById = new Map(
    (responsibleStaff ?? []).map((staff) => [staff.id, staff]),
  );
  const schoolNameById = new Map(
    (schools ?? []).map((school) => [school.id, school.name]),
  );
  if (eventsError) {
    console.error("approvals.query.pending-events failed", {
      code: eventsError.code,
      platformAdmin: actor.isPlatformAdmin,
    });
  }
  const pendingQueue = pendingEvents ?? [];
  const filteredEvents = pendingQueue.filter((event) =>
    matchesSearch(searchQuery, [event.title, event.location, event.category]),
  );

  const selectedId = getSearchParam(params.selected);
  const selected =
    filteredEvents.find((event) => event.id === selectedId) ?? filteredEvents[0] ?? null;
  const hrefFor = (eventId: string) =>
    `/approvals?selected=${eventId}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`;

  return (
    <div className="cl-page">
      <PageHead
        subtitle={tf("approvals.list.subtitle", { count: pendingQueue.length })}
        title={t("approvals.title")}
      />

      {pendingQueue.length > 4 || searchQuery ? (
        <div className="cl-filters">
          <form action="/approvals" className="cl-search cl-search-wide" role="search">
            <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="sr-only">{t("filters.search")}</span>
            <input defaultValue={searchQuery} name="q" placeholder={t("filters.searchEvents")} type="search" />
          </form>
        </div>
      ) : null}

      {eventsError ? (
        <div className="error-box" role="alert">
          {tf("approvals.errors.loadFailed", {
            error: t("common.somethingWentWrong"),
          })}
        </div>
      ) : selected ? (
        <div className="cl-inbox">
          <nav aria-label={t("approvals.pending.title")} className="cl-card cl-rows self-start overflow-hidden">
            {filteredEvents.map((event) => (
              <Link
                aria-current={event.id === selected.id ? "page" : undefined}
                className="cl-row cl-inbox-row"
                href={hrefFor(event.id)}
                key={event.id}
                prefetch={false}
                scroll={false}
              >
                <span className="cl-grow">
                  <span className="cl-row-title">{event.title}</span>
                  <span className="cl-row-sub">
                    {(event.club_id && clubNameById.get(event.club_id)) ||
                      (actor.isPlatformAdmin ? schoolNameById.get(event.school_id) : null) ||
                      t("approvals.fallback.clubEvent")}{" "}
                    · {formatDate(event.starts_at, locale)}
                  </span>
                </span>
                <CategoryLabel
                  category={event.category}
                  label={event.category ? categoryLabel(event.category, t) : null}
                />
              </Link>
            ))}
          </nav>

          <article className="cl-card cl-panel cl-approval">
            <div className="flex items-center gap-4">
              <Cover
                category={selected.category}
                className="cl-approval-cover"
                imageUrl={null}
                initials={initialsOf(
                  (selected.club_id && clubNameById.get(selected.club_id)) || selected.title,
                )}
              />
              <div className="min-w-0">
                <CategoryLabel
                  category={selected.category}
                  label={selected.category ? categoryLabel(selected.category, t) : null}
                />
                <h2 className="mt-1 text-[22px] font-bold leading-tight text-[var(--foreground)]">
                  {selected.title}
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  {formatDateTime(selected.starts_at, locale)} – {formatTime(selected.ends_at, locale)}
                  {selected.location ? ` · ${selected.location}` : ""}
                </p>
              </div>
            </div>
            <EventCompletenessBadge
              labels={completenessLabels}
              result={getApprovalEventCompleteness(selected)}
            />
            {[selected].map((event) => (
              <div className="cl-approval-details" key={event.id}>
                <dl className="cl-kv">
                    <div>
                      <dt className="text-zinc-500">{t("events.practicalDetails.cost")}</dt>
                      <dd className="text-zinc-800">
                        {formatEventCost(
                          {
                            costAmount: event.cost_amount,
                            costCurrency: event.cost_currency,
                            costType: event.cost_type,
                          },
                          locale,
                          {
                            free: t("events.practicalDetails.free"),
                            notSpecified: t("events.practicalDetails.costNotSpecified"),
                            variable: t("events.practicalDetails.variableCost"),
                          },
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("approvals.event.location")}
                      </dt>
                      <dd className="text-zinc-800">{event.location || "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("approvals.event.maxParticipants")}
                      </dt>
                      <dd className="text-zinc-800">
                        {event.capacity ?? t("events.capacity.noLimit")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("approvals.event.submitted")}
                      </dt>
                      <dd className="text-zinc-800">
                        {event.submitted_at
                          ? formatDate(event.submitted_at, locale)
                          : formatDate(event.created_at, locale)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("approvals.event.safety")}
                      </dt>
                      <dd className="text-zinc-800">
                        {riskLabel(event.risk_level, t)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("approvals.event.permission")}
                      </dt>
                      <dd className="text-zinc-800">
                        {event.permission_required
                          ? t("events.permission.mayBeRequired")
                          : t("events.permission.notRequired")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("events.decisionInfo.responsibleAdult")}
                      </dt>
                      <dd className="text-zinc-800">
                        {responsibleStaffLabel(
                          event.responsible_staff_id
                            ? responsibleStaffById.get(event.responsible_staff_id)
                            : undefined,
                          t,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("events.decisionInfo.eligibility")}
                      </dt>
                      <dd className="whitespace-pre-wrap text-zinc-800">
                        {event.eligibility_notes ??
                          t("events.decisionInfo.eligibilityNotSpecified")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("events.decisionInfo.experienceLevel")}
                      </dt>
                      <dd className="text-zinc-800">
                        {experienceLevelLabel(event.experience_level, t)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("events.decisionInfo.accessibilityInformation")}
                      </dt>
                      <dd className="whitespace-pre-wrap text-zinc-800">
                        {event.accessibility_notes ??
                          t("events.decisionInfo.accessibilityNotProvided")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("events.practicalDetails.requiredMaterials")}
                      </dt>
                      <dd className="whitespace-pre-wrap text-zinc-800">
                        {event.required_materials ??
                          t("events.practicalDetails.materialsNotSpecified")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">
                        {t("events.practicalDetails.expectedCommitment")}
                      </dt>
                      <dd className="whitespace-pre-wrap text-zinc-800">
                        {event.expected_commitment ??
                          t("events.practicalDetails.commitmentNotSpecified")}
                      </dd>
                    </div>
                    {event.cost_notes ? (
                      <div>
                        <dt className="text-zinc-500">
                          {t("events.practicalDetails.costNotes")}
                        </dt>
                        <dd className="whitespace-pre-wrap text-zinc-800">
                          {event.cost_notes}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {event.cancellation_notice ? (
                    <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
                      <p className="font-medium">
                        {t(
                          "events.supervisionSchedule.importantScheduleUpdate",
                        )}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words leading-6">
                        {event.cancellation_notice}
                      </p>
                    </div>
                  ) : null}
                  {event.permission_note ? (
                    <div className="mt-3 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
                      <p className="font-medium text-zinc-900">
                        {t("events.permission.note")}
                      </p>
                      <p className="mt-1 leading-6">{event.permission_note}</p>
                    </div>
                  ) : null}
                  {event.description ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      {event.description}
                    </p>
                  ) : null}
                
              </div>
            ))}
            <div className="flex flex-wrap items-start gap-2">
              <form action={approveEvent}>
                <input name="event_id" type="hidden" value={selected.id} />
                <PendingSubmitButton
                  className="btn btn-primary min-h-11 px-5"
                  pendingLabel={t("approvals.actions.approving")}
                  toastMessage={t("approvals.actions.approving")}
                >
                  {t("approvals.actions.approve")}
                </PendingSubmitButton>
              </form>
              <details className="cl-decline">
                <summary className="btn btn-quiet min-h-11">
                  {t("approvals.actions.reject")}…
                </summary>
                <form action={rejectEvent} className="mt-3 flex max-w-xl flex-col gap-3">
                  <input name="event_id" type="hidden" value={selected.id} />
                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                    {t("approvals.reject.reasonLabel")}
                    <textarea
                      className="min-h-20 rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-zinc-900"
                      name="rejection_reason"
                    />
                  </label>
                  <PendingSubmitButton
                    className="btn btn-secondary min-h-9 w-full px-3 sm:w-fit"
                    pendingLabel={t("approvals.actions.rejecting")}
                    toastMessage={t("approvals.actions.rejecting")}
                  >
                    {t("approvals.actions.reject")}
                  </PendingSubmitButton>
                </form>
              </details>
            </div>
          </article>
        </div>
      ) : pendingQueue.length && searchQuery ? (
        <NoResultsState
          clearHref="/approvals"
          clearLabel={t("filters.clear")}
          description={t("filters.noResultsDescription")}
          title={t("filters.noResults")}
        />
      ) : (
        <div className="cl-card cl-empty">
          <b className="block text-[var(--foreground)]">{t("approvals.empty.title")}</b>
          <p className="mt-1">{t("approvals.empty.description")}</p>
        </div>
      )}
    </div>
  );
}

function getApprovalEventCompleteness(event: PendingEvent) {
  return getEventListingCompleteness({
    accessibilityNotes: event.accessibility_notes,
    category: event.category,
    costAmount: event.cost_amount,
    costCurrency: event.cost_currency,
    costNotes: event.cost_notes,
    costType: event.cost_type,
    description: event.description,
    eligibilityNotes: event.eligibility_notes,
    endsAt: event.ends_at,
    experienceLevel: event.experience_level,
    expectedCommitment: event.expected_commitment,
    location: event.location,
    requiredMaterials: event.required_materials,
    responsibleAdultRequired: true,
    responsibleStaffId: event.responsible_staff_id,
    startsAt: event.starts_at,
  });
}

function riskLabel(riskLevel: PendingEvent["risk_level"], t: Translate) {
  if (riskLevel === "high") {
    return t("events.risk.high");
  }

  return riskLevel === "medium"
    ? t("events.risk.medium")
    : t("events.risk.low");
}

function experienceLevelLabel(
  experienceLevel: EventExperienceLevel | null,
  t: Translate,
) {
  if (experienceLevel === "beginner_friendly") {
    return t("events.experience.beginnerFriendly");
  }

  if (experienceLevel === "prior_experience_recommended") {
    return t("events.experience.priorExperienceRecommended");
  }

  return t("events.decisionInfo.experienceNotSpecified");
}

function responsibleStaffLabel(
  staff: ResponsibleStaffProfile | undefined,
  t: Translate,
) {
  if (!staff || staff.status !== "active") {
    return t("events.decisionInfo.responsibleNotSpecified");
  }

  const roleLabel =
    staff.role === "school_admin"
      ? t("roles.schoolAdmin")
      : t("roles.teacher");

  return `${staff.full_name} (${roleLabel})`;
}

function categoryLabel(category: string, t: Translate) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}
