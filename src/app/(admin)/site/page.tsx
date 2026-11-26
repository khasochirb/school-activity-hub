import Link from "next/link";
import { buildPageTree, type SitePage } from "@/lib/site/page-tree";
import { PageHead, Section } from "../_components/clean-ui";
import { createSitePage } from "./actions";
import { loadSiteEditor } from "./site-editor-data";
import { SitePageForm } from "./site-page-form";

// Staff editor for the school's public site: the page list and a form to add one.
export default async function SiteEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { formLabels, pages, school, t } = await loadSiteEditor();
  const { error, saved } = await searchParams;
  const tree = buildPageTree(pages);
  const topLevel = pages.filter((page) => !page.parent_id);

  return (
    <div className="cl-page">
      <PageHead
        action={
          school ? (
            <Link className="btn btn-secondary min-h-10 px-4" href={`/s/${school.slug}`} prefetch={false} target="_blank">
              {t("site.viewSite")}
            </Link>
          ) : undefined
        }
        subtitle={t("site.description")}
        title={t("site.title")}
      />

      {saved ? <p className="notice-box notice-success" role="status">{t("common.savedSuccessfully")}</p> : null}
      {error ? (
        <p className="notice-box notice-danger" role="alert">
          {error === "title" ? t("site.errors.titleRequired") : t("common.somethingWentWrong")}
        </p>
      ) : null}

      <div className="cl-split">
        <div className="cl-main">
          <Section title={t("site.pages")}>
            {tree.length ? (
              <ul className="cl-card flex flex-col divide-y divide-[var(--border)] p-0">
                {tree.map((page) => (
                  <li key={page.id}>
                    <PageRow draftLabel={t("status.draft")} page={page} />
                    {page.children.map((child) => (
                      <PageRow child draftLabel={t("status.draft")} key={child.id} page={child} />
                    ))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cl-card cl-panel text-sm text-[var(--muted)]">{t("site.empty")}</p>
            )}
          </Section>
        </div>
        <aside className="cl-side">
          <div className="cl-card cl-widget">
            <h3>{t("site.addPage")}</h3>
            <SitePageForm action={createSitePage} labels={formLabels} parents={topLevel} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function PageRow({ child = false, draftLabel, page }: { child?: boolean; draftLabel: string; page: SitePage }) {
  return (
    <Link
      className={[
        "flex min-h-12 items-center justify-between gap-3 px-4 py-2 text-[15px] hover:bg-[var(--card-soft)]",
        child ? "pl-9 text-[var(--muted)]" : "font-semibold text-[var(--foreground)]",
      ].join(" ")}
      href={`/site/${page.id}`}
      prefetch={false}
    >
      <span className="min-w-0 truncate">{page.title}</span>
      {page.status === "draft" ? (
        <span className="cl-tag" data-tone="warn">
          {draftLabel}
        </span>
      ) : null}
    </Link>
  );
}
