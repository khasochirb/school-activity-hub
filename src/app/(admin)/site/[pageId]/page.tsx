import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHead } from "../../_components/clean-ui";
import { deleteSitePage, updateSitePage } from "../actions";
import { loadSiteEditor } from "../site-editor-data";
import { SitePageForm } from "../site-page-form";

// Staff editor for one page of the school's public site.
export default async function EditSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ pageId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { formLabels, pages, school, t } = await loadSiteEditor();
  const { pageId } = await params;
  const { error } = await searchParams;
  const page = pages.find((candidate) => candidate.id === pageId);

  if (!page) {
    notFound();
  }

  return (
    <div className="cl-page">
      <PageHead
        action={
          <Link className="btn btn-secondary min-h-10 px-4" href="/site" prefetch={false}>
            {t("common.back")}
          </Link>
        }
        subtitle={school && page.status === "published" ? `/s/${school.slug}/${page.slug}` : t("status.draft")}
        title={page.title}
      />

      {error ? (
        <p className="notice-box notice-danger" role="alert">
          {error === "title" ? t("site.errors.titleRequired") : t("common.somethingWentWrong")}
        </p>
      ) : null}

      <div className="cl-card cl-panel max-w-3xl">
        <SitePageForm
          action={updateSitePage}
          labels={formLabels}
          page={page}
          parents={pages.filter((candidate) => !candidate.parent_id)}
        />
      </div>

      <form action={deleteSitePage} className="max-w-3xl">
        <input name="page_id" type="hidden" value={page.id} />
        <ConfirmSubmitButton
          cancelLabel={t("common.cancel")}
          className="btn btn-quiet min-h-10 px-4"
          confirmDescription={t("feedback.cannotBeUndone")}
          confirmLabel={t("feedback.confirm")}
          confirmTitle={t("common.delete")}
          pendingLabel={t("common.saving")}
        >
          {t("common.delete")}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
