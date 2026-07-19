import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { PendingSubmitButton } from "@/components/pending-submit-button";
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
import { getSearchParam, matchesSearch } from "@/lib/list-filters";
import { createClient } from "@/lib/supabase/server";
import {
  DetailsDisclosure,
  EmptyState,
  FilterPanel,
  NoResultsState,
  PageHeader,
  SearchField,
} from "../_components/page-ui";
import { approveEvent, rejectEvent } from "./actions";

type StaffProfile = {
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type PendingEvent = {
  id: string;
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
  submitted_at: string | null;
  created_at: string;
};

type Club = {
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
  const params = await searchParams;
  const searchQuery = getSearchParam(params.q);
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .maybeSingle<StaffProfile>();

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: pendingEvents, error: eventsError } = await supabase
    .from("events")
    .select(
      "id, club_id, title, description, category, location, starts_at, ends_at, capacity, risk_level, permission_required, permission_note, responsible_staff_id, eligibility_notes, experience_level, accessibility_notes, cost_type, cost_amount, cost_currency, cost_notes, required_materials, expected_commitment, submitted_at, created_at",
    )
    .eq("school_id", profile.school_id)
    .eq("status", "pending_approval")
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
  const [{ data: clubs }, { data: responsibleStaff }] = await Promise.all([
    clubIds.length
      ? supabase
          .from("clubs")
          .select("id, name")
          .eq("school_id", profile.school_id)
          .in("id", clubIds)
          .returns<Club[]>()
      : Promise.resolve({ data: [] as Club[] }),
    responsibleStaffIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name, role, status")
          .eq("school_id", profile.school_id)
          .in("id", responsibleStaffIds)
          .in("role", ["school_admin", "teacher"])
          .returns<ResponsibleStaffProfile[]>()
      : Promise.resolve({ data: [] as ResponsibleStaffProfile[] }),
  ]);

  const clubNameById = new Map((clubs ?? []).map((club) => [club.id, club.name]));
  const responsibleStaffById = new Map(
    (responsibleStaff ?? []).map((staff) => [staff.id, staff]),
  );
  const pendingQueue = pendingEvents ?? [];
  const filteredEvents = pendingQueue.filter((event) =>
    matchesSearch(searchQuery, [event.title, event.location, event.category]),
  );

  return (
    <div className="page-stack">
      <PageHeader
        description={t("approvals.description")}
        title={t("approvals.title")}
      />

      <FilterPanel
        action="/approvals"
        clearHref="/approvals"
        clearLabel={t("filters.clear")}
        resultCountLabel={tf("filters.showingResults", {
          count: filteredEvents.length,
        })}
        submitLabel={t("filters.filter")}
      >
        <SearchField
          defaultValue={searchQuery}
          label={t("filters.search")}
          placeholder={t("filters.searchEvents")}
        />
      </FilterPanel>

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">{t("approvals.pending.title")}</h2>
          {eventsError ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("approvals.errors.loadFailed", {
                error: t("common.somethingWentWrong"),
              })}
            </p>
          ) : null}
        </div>
        {pendingQueue.length && filteredEvents.length ? (
          <div className="grid gap-3 p-3">
            {filteredEvents.map((event) => (
              <article
                className="rounded-lg border border-zinc-200 p-4"
                key={event.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-950">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {formatDateTime(event.starts_at, locale)} -{" "}
                      {formatTime(event.ends_at, locale)}
                    </p>
                  </div>
                  <form action={approveEvent}>
                    <input name="event_id" type="hidden" value={event.id} />
                    <PendingSubmitButton
                      className="btn btn-primary min-h-9 px-3"
                      pendingLabel={t("approvals.actions.approving")}
                      toastMessage={t("approvals.actions.approving")}
                    >
                      {t("approvals.actions.approve")}
                    </PendingSubmitButton>
                  </form>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{t("status.pendingApproval")}</Badge>
                  {event.category ? (
                    <Badge>{categoryLabel(event.category, t)}</Badge>
                  ) : null}
                  {event.club_id ? (
                    <Badge>
                      {clubNameById.get(event.club_id) ??
                        t("approvals.fallback.clubEvent")}
                    </Badge>
                  ) : null}
                  <Badge variant={riskBadgeVariant(event.risk_level)}>
                    {riskLabel(event.risk_level, t)}
                  </Badge>
                  {event.permission_required ? (
                    <Badge variant="warning">
                      {t("events.permission.required")}
                    </Badge>
                  ) : null}
                  {event.experience_level ? (
                    <Badge>{experienceLevelLabel(event.experience_level, t)}</Badge>
                  ) : null}
                  <Badge>
                    {formatEventCost(
                      {
                        costAmount: event.cost_amount,
                        costCurrency: event.cost_currency,
                        costType: event.cost_type,
                      },
                      locale,
                      {
                        free: t("events.practicalDetails.free"),
                        notSpecified: t(
                          "events.practicalDetails.costNotSpecified",
                        ),
                        variable: t("events.practicalDetails.variableCost"),
                      },
                    )}
                  </Badge>
                </div>
                <DetailsDisclosure label={t("common.viewDetails")}>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
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
                </DetailsDisclosure>
                <form action={rejectEvent} className="mt-3 flex max-w-xl flex-col gap-3">
                  <input name="event_id" type="hidden" value={event.id} />
                  <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800">
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
              </article>
            ))}
          </div>
        ) : pendingQueue.length && searchQuery ? (
          <div className="p-4">
            <NoResultsState
              clearHref="/approvals"
              clearLabel={t("filters.clear")}
              description={t("filters.noResultsDescription")}
              title={t("filters.noResults")}
            />
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              description={t("approvals.empty.description")}
              title={t("approvals.empty.title")}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "danger" | "default" | "warning";
}) {
  return (
    <span
      className={
        variant === "danger"
          ? "rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
          : variant === "warning"
            ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
            : "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
      }
    >
      {children}
    </span>
  );
}

function riskBadgeVariant(riskLevel: PendingEvent["risk_level"]) {
  return riskLevel === "high"
    ? "danger"
    : riskLevel === "medium"
      ? "warning"
      : "default";
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
