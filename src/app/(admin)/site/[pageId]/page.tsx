import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageHead } from "../../_components/clean-ui";
import { deleteSitePage, updateSitePage } from "../actions";
import { loadSiteEditor } from "../site-editor-data";
import { SitePageForm } from "../site-page-form";
import { siteCoverUrl } from "@/lib/site/site-cover";
import { SiteCoverUploader, type SiteCoverLabels } from "./site-cover-uploader";

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

  const media = (key: string) => t(`clubs.profile.media.${key}`);
  const coverLabels: SiteCoverLabels = {
    description: t("site.cover.description"),
    errors: {
      animated: media("errors.animated"),
      dimensions: media("errors.dimensions"),
      editDenied: t("common.somethingWentWrong"),
      invalidImage: media("errors.invalidImage"),
      invalidType: media("errors.invalidType"),
      mimeMismatch: media("errors.mimeMismatch"),
      removeFailed: media("errors.removeFailed"),
      saveFailed: media("errors.saveFailed"),
      tooLarge: media("errors.tooLarge"),
      uploadFailed: media("errors.uploadFailed"),
    },
    guidance: t("events.poster.guidance"),
    noPhoto: t("events.poster.noPoster"),
    remove: media("actions.remove"),
    removed: t("site.cover.removed"),
    removing: media("actions.removing"),
    replace: media("actions.replace"),
    requirements: t("site.cover.requirements"),
    title: t("site.cover.title"),
    upload: media("actions.upload"),
    uploaded: t("site.cover.uploaded"),
    uploading: media("actions.uploading"),
  };

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

      <SiteCoverUploader
        coverUrl={school ? siteCoverUrl(school.slug, page.slug, page.cover_path) : null}
        labels={coverLabels}
        pageId={page.id}
      />

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
