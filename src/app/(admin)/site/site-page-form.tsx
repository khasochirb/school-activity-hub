import { PendingSubmitButton } from "@/components/pending-submit-button";
import type { SitePage } from "@/lib/site/page-tree";

export type SitePageFormLabels = {
  body: string;
  bodyHint: string;
  parent: string;
  publish: string;
  save: string;
  saving: string;
  title: string;
  topLevel: string;
};

// One form for a new page and for editing one. Only top-level pages can be a
// parent, so the menu stays two levels deep.
export function SitePageForm({
  action,
  labels,
  page,
  parents,
}: {
  action: (formData: FormData) => Promise<void>;
  labels: SitePageFormLabels;
  page?: SitePage;
  parents: SitePage[];
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      {page ? <input name="page_id" type="hidden" value={page.id} /> : null}
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.title}
        <input
          className="h-11 rounded-md border bg-white px-3 text-base font-normal outline-none"
          defaultValue={page?.title ?? ""}
          maxLength={120}
          name="title"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.parent}
        <select
          className="h-11 rounded-md border bg-white px-3 text-base font-normal outline-none"
          defaultValue={page?.parent_id ?? ""}
          name="parent_id"
        >
          <option value="">{labels.topLevel}</option>
          {parents
            .filter((parent) => parent.id !== page?.id)
            .map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.title}
              </option>
            ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.body}
        <textarea
          className="min-h-48 rounded-md border bg-white px-3 py-2 text-base font-normal leading-7 outline-none"
          defaultValue={page?.body ?? ""}
          maxLength={20000}
          name="body"
        />
        <span className="text-sm font-normal text-slate-600">{labels.bodyHint}</span>
      </label>
      <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
        <input
          className="h-5 w-5 accent-[var(--primary)]"
          defaultChecked={page ? page.status === "published" : true}
          name="published"
          type="checkbox"
        />
        {labels.publish}
      </label>
      <div>
        <PendingSubmitButton
          className="btn btn-primary min-h-11 px-5"
          pendingLabel={labels.saving}
          toastMessage={labels.saving}
        >
          {labels.save}
        </PendingSubmitButton>
      </div>
    </form>
  );
}
