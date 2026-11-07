import { redirect } from "next/navigation";
import {
  getOwnRoster,
  getPortfolioI18n,
  getPortfolioViewer,
  getStudentLinks,
} from "@/lib/portfolio/portfolio-data";
import { EmptyState, HeaderActionLink, PageHeader } from "../../_components/page-ui";
import { EntryForm } from "../entry-form";
import { buildEntryFormLabels } from "../entry-form-labels";

export default async function NewPortfolioEntryPage() {
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
          clubId: null,
          entryDate: today,
          eventId: null,
          id: null,
          isDraft: false,
          kind: "reflection",
          title: "",
          visibility: "staff",
        }}
        labels={buildEntryFormLabels(t, "create")}
      />
    </div>
  );
}
