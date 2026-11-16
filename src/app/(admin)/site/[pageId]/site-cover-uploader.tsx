"use client";

import { useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { SITE_COVER_BUCKET, inspectSiteCover } from "@/lib/site/site-cover";
import { createClient } from "@/lib/supabase/client";
import {
  discardSiteCoverUpload,
  finalizeSiteCoverUpload,
  prepareSiteCoverUpload,
  removeSiteCover,
  type SiteCoverActionCode,
} from "../cover-actions";

export type SiteCoverLabels = {
  description: string;
  errors: Record<SiteCoverActionCode, string>;
  guidance: string;
  noPhoto: string;
  remove: string;
  removed: string;
  removing: string;
  replace: string;
  requirements: string;
  title: string;
  upload: string;
  uploaded: string;
  uploading: string;
};

// One cover photo for a site page: checked in the browser, uploaded straight to
// storage through a signed URL, then checked again on the server.
export function SiteCoverUploader({
  coverUrl,
  labels,
  pageId,
}: {
  coverUrl: string | null;
  labels: SiteCoverLabels;
  pageId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [url, setUrl] = useState(coverUrl);
  const [pending, setPending] = useState<"remove" | "upload" | null>(null);

  function fail(code: SiteCoverActionCode) {
    toast.notify({ message: labels.errors[code] ?? labels.errors.uploadFailed, title: toast.labels.error, variant: "error" });
  }

  function done(message: string) {
    toast.notify({ message, title: toast.labels.success, variant: "success" });
  }

  async function upload(file: File | undefined) {
    if (!file || pending) return;
    setPending("upload");

    try {
      const inspection = inspectSiteCover(await file.arrayBuffer(), file.type);

      if (!inspection.ok) return fail(inspection.code);

      const prepared = await prepareSiteCoverUpload({ mimeType: inspection.mimeType, pageId, size: file.size });

      if (!prepared.ok || !prepared.path || !prepared.uploadToken) {
        return fail(prepared.ok ? "uploadFailed" : prepared.code);
      }

      const { error } = await supabase.storage
        .from(SITE_COVER_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.uploadToken, file, { cacheControl: "3600", contentType: inspection.mimeType });

      if (error) {
        await discardSiteCoverUpload({ pageId, path: prepared.path });
        return fail("uploadFailed");
      }

      const finalized = await finalizeSiteCoverUpload({ pageId, path: prepared.path });

      if (!finalized.ok) return fail(finalized.code);

      setUrl(finalized.url ?? null);
      done(labels.uploaded);
    } catch {
      fail("uploadFailed");
    } finally {
      setPending(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (pending) return;
    setPending("remove");

    try {
      const result = await removeSiteCover({ pageId });

      if (!result.ok) return fail(result.code);

      setUrl(null);
      done(labels.removed);
    } catch {
      fail("removeFailed");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="cl-card cl-panel max-w-3xl">
      <h2 className="text-sm font-bold">{labels.title}</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{labels.description}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{labels.guidance}</p>

      <div className="site-cover-preview mt-4">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a private route, not an optimizable asset
          <img alt={labels.title} src={url} />
        ) : (
          <span>{labels.noPhoto}</span>
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{labels.requirements}</p>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={Boolean(pending)}
        onChange={(event) => void upload(event.target.files?.[0])}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          aria-busy={pending === "upload"}
          className="btn btn-primary min-h-10"
          disabled={Boolean(pending)}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {pending === "upload" ? labels.uploading : url ? labels.replace : labels.upload}
        </button>
        {url ? (
          <button className="btn btn-secondary min-h-10" disabled={Boolean(pending)} onClick={() => void remove()} type="button">
            {pending === "remove" ? labels.removing : labels.remove}
          </button>
        ) : null}
      </div>
    </section>
  );
}
