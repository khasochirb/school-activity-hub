import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/i18n/date-format";
import {
  entryVisibleAs,
  type PortfolioViewAs,
} from "@/lib/portfolio/portfolio";
import {
  getFeedbackCounts,
  getOwnRoster,
  getPortfolioEntries,
  getPortfolioI18n,
  getPortfolioViewer,
  getStudentLinks,
} from "@/lib/portfolio/portfolio-data";
import { EmptyState, HeaderActionLink } from "../_components/page-ui";
import { PortfolioGrid, type PortfolioGridLabels } from "./portfolio-grid";

const VIEWS: PortfolioViewAs[] = ["me", "teacher", "classmate"];

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { locale, t, tf } = await getPortfolioI18n();
  const viewer = await getPortfolioViewer();

  if (!viewer) redirect("/login");

  if (viewer.role !== "student") {
    return (
      <div className="page-stack">
        <EmptyState
          action={
            <HeaderActionLink href="/students" variant="secondary">
              {t("nav.students")}
            </HeaderActionLink>
          }
          description={t("portfolio.staff.notStudent")}
          title={t("portfolio.title")}
        />
      </div>
    );
  }

  const student = await getOwnRoster(viewer);

  if (!student) {
    return (
      <div className="page-stack">
        <EmptyState
          description={t("portfolio.errors.noRoster")}
          title={t("portfolio.title")}
        />
      </div>
    );
  }

  const params = await searchParams;
  const viewAs: PortfolioViewAs = VIEWS.includes(params.as as PortfolioViewAs)
    ? (params.as as PortfolioViewAs)
    : "me";
  const [entries, links] = await Promise.all([
    getPortfolioEntries(student.id),
    getStudentLinks(viewer.schoolId, student.id),
  ]);
  const shared = entries.filter((entry) => !entry.is_draft);
  const feedbackCounts = await getFeedbackCounts(shared.map((entry) => entry.id));
  const notes = [...feedbackCounts.values()].reduce((sum, n) => sum + n, 0);
  const visible = entries.filter((entry) => entryVisibleAs(entry, viewAs));
  const owner = viewAs === "me";
  const labels: PortfolioGridLabels = {
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
  };

  return (
    <div className="page-stack">
      {!owner ? (
        <div className="portfolio-preview-banner" role="status">
          <span>
            {viewAs === "teacher"
              ? t("portfolio.viewAs.bannerTeacher")
              : t("portfolio.viewAs.bannerClassmate")}
          </span>
          <Link className="btn btn-secondary" href="/portfolio">
            {t("portfolio.viewAs.back")}
          </Link>
        </div>
      ) : null}

      <section className="portfolio-profile">
        <span aria-hidden="true" className="portfolio-avatar">
          {student.initials}
        </span>
        <p className="page-eyebrow">{t("portfolio.eyebrow")}</p>
        <h1 className="page-title">{student.displayName}</h1>
        {student.gradeLabel ? (
          <p className="text-[var(--muted)]">{student.gradeLabel}</p>
        ) : null}
        <p className="portfolio-intro">{t("portfolio.description")}</p>
        <div className="portfolio-stats">
          <span>
            <b>{shared.length}</b> {t("portfolio.stats.entries")}
          </span>
          <span>
            <b>{links.clubs.length}</b> {t("portfolio.stats.clubs")}
          </span>
          <span>
            <b>{links.attendedCount}</b> {t("portfolio.stats.eventsAttended")}
          </span>
          <span>
            <b>{notes}</b> {t("portfolio.stats.teacherNotes")}
          </span>
        </div>
        {owner ? (
          <div className="mt-2">
            <HeaderActionLink href="/portfolio/new">
              + {t("portfolio.add")}
            </HeaderActionLink>
          </div>
        ) : null}
      </section>

      <div className="portfolio-bar">
        <span className="portfolio-viewas">
          {t("portfolio.viewAs.label")}
          <span
            aria-label={t("portfolio.viewAs.label")}
            className="portfolio-segtabs"
            role="group"
          >
            {VIEWS.map((view) => (
              <Link
                aria-current={view === viewAs ? "page" : undefined}
                href={view === "me" ? "/portfolio" : `/portfolio?as=${view}`}
                key={view}
                scroll={false}
              >
                {t(`portfolio.viewAs.${view}`)}
              </Link>
            ))}
          </span>
        </span>
      </div>

      {!visible.length && !owner ? (
        <EmptyState
          description={t("portfolio.description")}
          title={t("portfolio.empty.viewerTitle")}
        />
      ) : (
        <>
          <PortfolioGrid
            addHref={owner ? "/portfolio/new" : undefined}
            entries={visible}
            formatDate={(value) => formatDate(`${value}T12:00:00`, locale)}
            labels={labels}
            showVisibility={owner}
          />
          {owner && !entries.length ? (
            <EmptyState
              description={t("portfolio.empty.ownerText")}
              title={t("portfolio.empty.ownerTitle")}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
