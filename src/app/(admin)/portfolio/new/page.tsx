import { redirect } from "next/navigation";
import {
  DEFAULT_EVENT_TIME_ZONE,
  eventCalendarDayKey,
} from "@/lib/events/event-calendar-range";
import { PORTFOLIO_TITLE_MAX } from "@/lib/portfolio/portfolio";
import {
  getOwnRoster,
  getPortfolioI18n,
  getPortfolioViewer,
  getStudentLinks,
} from "@/lib/portfolio/portfolio-data";
import { EmptyState, HeaderActionLink, PageHeader } from "../../_components/page-ui";
import { EntryForm } from "../entry-form";
import { buildEntryFormLabels } from "../entry-form-labels";

export default async function NewPortfolioEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string | string[] }>;
}) {
  const { t } = await getPortfolioI18n();
  const viewer = await getPortfolioViewer();

  if (!viewer) redirect("/login");
  if (viewer.role !== "student") redirect("/portfolio");

  const student = await getOwnRoster(viewer);

  if (!student) {
    return (
      <div className="page-stack">
        <EmptyState
          description={t("portfolio.errors.noRoster")}
          title={t("portfolio.form.newTitle")}
        />
      </div>
    );
  }

  const links = await getStudentLinks(viewer.schoolId, student.id);
  const today = new Date().toISOString().slice(0, 10);
  // From "add a reflection" on an automatic record: only an event the student
  // took part in, at their own school, is filled in.
  const { event: eventParam } = await searchParams;
  const record = links.participation.find(
    (item) => item.eventId === eventParam && item.schoolId === viewer.schoolId,
  );

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <HeaderActionLink href="/portfolio" variant="secondary">
            {t("portfolio.entry.back")}
          </HeaderActionLink>
        }
        description={t("portfolio.description")}
        eyebrow={t("portfolio.eyebrow")}
        title={t("portfolio.form.newTitle")}
      />
      <EntryForm
        cancelHref="/portfolio"
        clubs={links.clubs}
        events={links.events}
        initial={{
          body: "",
          clubId: links.clubs.some((club) => club.id === record?.clubId)
            ? (record?.clubId ?? null)
            : null,
          entryDate: record
            ? eventCalendarDayKey(record.startsAt, DEFAULT_EVENT_TIME_ZONE)
            : today,
          eventId: record?.eventId ?? null,
          id: null,
          isDraft: false,
          kind: "reflection",
          title: record?.title.slice(0, PORTFOLIO_TITLE_MAX) ?? "",
          visibility: "staff",
        }}
        labels={buildEntryFormLabels(t, "create")}
      />
    </div>
  );
}
