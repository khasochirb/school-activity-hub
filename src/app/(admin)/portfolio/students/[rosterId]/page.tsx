import { notFound, redirect } from "next/navigation";
import { formatDate } from "@/lib/i18n/date-format";
import { isUuidValue } from "@/lib/portfolio/portfolio";
import {
  getPortfolioEntries,
  getPortfolioI18n,
  getPortfolioViewer,
  getRosterStudent,
} from "@/lib/portfolio/portfolio-data";
import { EmptyState, HeaderActionLink, PageHeader } from "../../../_components/page-ui";
import { PortfolioGrid } from "../../portfolio-grid";

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
  const entries = await getPortfolioEntries(rosterId);

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
    </div>
  );
}
