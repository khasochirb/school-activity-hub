import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/i18n/date-format";
import { recordsWithoutEntry } from "@/lib/portfolio/participation";
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
import { PortfolioRecords } from "./portfolio-records";

// The "teachers' view" and "classmates' view" previews were removed on
// 23 Nov 2026 (meeting notes §5): the student sees their own portfolio only.
export default async function PortfolioPage() {
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

  const [entries, links] = await Promise.all([
    getPortfolioEntries(student.id),
    getStudentLinks(viewer.schoolId, student.id),
  ]);
  const shared = entries.filter((entry) => !entry.is_draft);
  const feedbackCounts = await getFeedbackCounts(shared.map((entry) => entry.id));
  const notes = [...feedbackCounts.values()].reduce((sum, n) => sum + n, 0);
  const records = recordsWithoutEntry(links.participation, entries);
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
        <div className="mt-2">
          <HeaderActionLink href="/portfolio/new">
            + {t("portfolio.add")}
          </HeaderActionLink>
        </div>
      </section>

      <section aria-labelledby="portfolio-clubs-title" className="portfolio-clubs">
        <h2 id="portfolio-clubs-title">{t("portfolio.myClubs.title")}</h2>
        {links.clubs.length ? (
          <ul>
            {links.clubs.map((club) => (
              <li key={club.id}>
                <Link href={`/clubs/${club.id}`} prefetch={false}>
                  <span aria-hidden="true" className="portfolio-club-mark">
                    {Array.from(club.label.trim())[0]?.toUpperCase() ?? "?"}
                  </span>
                  <b>{club.label}</b>
                  {club.role === "leader" ? (
                    <span className="cl-tag" data-tone="ok">
                      {t("clubs.memberRoles.leader")}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {t("portfolio.myClubs.empty")}{" "}
            <Link href="/clubs">{t("portfolio.myClubs.browse")}</Link>
          </p>
        )}
      </section>

      <PortfolioGrid
        addHref="/portfolio/new"
        entries={entries}
        formatDate={(value) => formatDate(`${value}T12:00:00`, locale)}
        labels={labels}
        showVisibility
      />
      {!entries.length ? (
        <EmptyState
          description={t("portfolio.empty.ownerText")}
          title={t("portfolio.empty.ownerTitle")}
        />
      ) : null}

      <PortfolioRecords
        formatDate={(value) => formatDate(value, locale)}
        labels={{
          addReflection: t("portfolio.records.addReflection"),
          attended: t("portfolio.records.attended"),
          club: t("portfolio.records.club"),
          description: t("portfolio.records.description"),
          title: t("portfolio.records.title"),
        }}
        ownSchoolId={viewer.schoolId}
        records={records}
      />
    </div>
  );
}
