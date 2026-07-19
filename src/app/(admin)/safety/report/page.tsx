import Link from "next/link";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../../_components/page-ui";
import { SafetyReportForm } from "./safety-report-form";

type EventOption = { id: string; title: string };
type ClubOption = { id: string; name: string };

export default async function SafetyReportPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const profile = await requireActiveSchoolProfile();
  const supabase = await createClient();
  const [eventsResult, clubsResult] = await Promise.all([
    supabase
      .from("events")
      .select("id, title")
      .eq("school_id", profile.school_id)
      .in("status", ["approved", "completed", "canceled"])
      .order("starts_at", { ascending: false })
      .limit(100)
      .returns<EventOption[]>(),
    supabase
      .from("clubs")
      .select("id, name")
      .eq("school_id", profile.school_id)
      .order("name")
      .limit(100)
      .returns<ClubOption[]>(),
  ]);

  if (eventsResult.error) {
    logServerError("Safety report event options failed", eventsResult.error);
  }

  if (clubsResult.error) {
    logServerError("Safety report club options failed", clubsResult.error);
  }

  const relatedActivities = [
    ...(eventsResult.data ?? []).map((event) => ({
      label: `${t("safety.related.eventPrefix")}: ${event.title}`,
      value: `event:${event.id}`,
    })),
    ...(clubsResult.data ?? []).map((club) => ({
      label: `${t("safety.related.clubPrefix")}: ${club.name}`,
      value: `club:${club.id}`,
    })),
  ];

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <Link className="btn btn-secondary" href="/safety" prefetch={false}>
            {t("safety.actions.back")}
          </Link>
        }
        description={t("safety.report.description")}
        title={t("safety.report.title")}
      />

      <section className="notice-box notice-warning">
        <p className="font-bold">{t("safety.urgent.title")}</p>
        <p className="mt-2 text-sm leading-6">{t("safety.urgent.notEmergency")}</p>
        <p className="mt-2 text-sm leading-6">{t("safety.urgent.urgentProcess")}</p>
        <p className="mt-2 text-sm leading-6">{t("safety.urgent.designatedOnly")}</p>
      </section>

      <section className="section-card section-card-padded max-w-3xl">
        <SafetyReportForm
          categories={[
            { label: t("safety.categories.personalSafety"), value: "personal_safety" },
            { label: t("safety.categories.bullyingOrHarassment"), value: "bullying_or_harassment" },
            { label: t("safety.categories.activityOrEvent"), value: "activity_or_event" },
            { label: t("safety.categories.onlineOrPlatform"), value: "online_or_platform" },
            { label: t("safety.categories.other"), value: "other" },
          ]}
          labels={{
            category: t("safety.report.fields.category"),
            description: t("safety.report.fields.description"),
            descriptionHelp: t("safety.report.fields.descriptionHelp"),
            immediateContact: t("safety.report.fields.immediateContact"),
            immediateContactHelp: t("safety.report.fields.immediateContactHelp"),
            noRelatedActivity: t("safety.report.fields.noRelatedActivity"),
            relatedActivity: t("safety.report.fields.relatedActivity"),
            submit: t("safety.report.actions.submit"),
            submitting: t("safety.report.actions.submitting"),
          }}
          relatedActivities={relatedActivities}
        />
      </section>
    </div>
  );
}
