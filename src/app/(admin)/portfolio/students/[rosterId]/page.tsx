import { notFound, redirect } from "next/navigation";
import { formatDate } from "@/lib/i18n/date-format";
import { recordsWithoutEntry } from "@/lib/portfolio/participation";
import { isUuidValue } from "@/lib/portfolio/portfolio";
import {
  getPortfolioEntries,
  getPortfolioI18n,
  getPortfolioViewer,
  getRosterStudent,
  getStudentLinks,
} from "@/lib/portfolio/portfolio-data";
import { EmptyState, HeaderActionLink, PageHeader } from "../../../_components/page-ui";
import { PortfolioGrid } from "../../portfolio-grid";
import { PortfolioRecords } from "../../portfolio-records";

export default async function StudentPortfolioPage({
  params,
}: {
  params: Promise<{ rosterId: string }>;
}) {
  const { rosterId } = await params;
  const { locale, t, tf } = await getPortfolioI18n();
  const viewer = await getPortfolioViewer();

  if (!viewer) redirect("/login");
  if (!isUuidValue(rosterId)) notFound();

  const student = await getRosterStudent(viewer.schoolId, rosterId);

  if (!student) notFound();

  // Row-level security returns only entries this viewer may see.
  // Attendance and club records are for the student and their school's staff.
  const [entries, links] = await Promise.all([
    getPortfolioEntries(rosterId),
    viewer.role === "student" ? null : getStudentLinks(viewer.schoolId, rosterId),
  ]);
  const records = links ? recordsWithoutEntry(links.participation, entries) : [];

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          viewer.role === "student" ? undefined : (
            <HeaderActionLink href="/students" variant="secondary">
              {t("nav.students")}
            </HeaderActionLink>
          )
        }
        description={t("portfolio.staff.description")}
        eyebrow={student.gradeLabel ?? t("portfolio.title")}
        title={tf("portfolio.staff.title", { name: student.displayName })}
      />
      {entries.length ? (
        <PortfolioGrid
          entries={entries}
          formatDate={(value) => formatDate(`${value}T12:00:00`, locale)}
          labels={{
            add: t("portfolio.add"),
            addDescription: t("portfolio.addDescription"),
            draft: t("portfolio.badges.draft"),
            featured: t("portfolio.badges.featured"),
            kinds: {
              achievement: t("portfolio.kinds.achievement"),
              photos: t("portfolio.kinds.photos"),
              project: t("portfolio.kinds.project"),
              reflection: t("portfolio.kinds.reflection"),
            },
            photoCount: (count) => tf("portfolio.badges.photos", { count }),
            visibility: {
              private: t("portfolio.visibility.private"),
              school: t("portfolio.visibility.school"),
              staff: t("portfolio.visibility.staff"),
            },
          }}
          showVisibility={false}
        />
      ) : (
        <EmptyState
          description={t("portfolio.staff.description")}
          title={t("portfolio.empty.viewerTitle")}
        />
      )}
      <PortfolioRecords
        formatDate={(value) => formatDate(value, locale)}
        labels={{
          attended: t("portfolio.records.attended"),
          club: t("portfolio.records.club"),
          description: t("portfolio.records.staffDescription"),
          title: t("portfolio.records.title"),
        }}
        records={records}
      />
    </div>
  );
}
