"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { useToast } from "@/components/toast-provider";
import {
  PORTFOLIO_MAX_PHOTOS,
  PORTFOLIO_MEDIA_BUCKET,
  PORTFOLIO_PHOTO_MAX_BYTES,
} from "@/lib/portfolio/portfolio";
import { createClient } from "@/lib/supabase/client";
import {
  addPortfolioFeedback,
  deletePortfolioEntryFromForm,
  discardPortfolioPhotoUpload,
  finalizePortfolioPhotoUpload,
  preparePortfolioPhotoUpload,
  removePortfolioPhoto,
  setFeaturedPortfolioEntry,
} from "./actions";

export type OwnerToolsLabels = {
  addPhotos: string;
  cancel: string;
  confirm: string;
  delete: string;
  deleteConfirm: string;
  deleting: string;
  errors: Record<string, string>;
  feature: string;
  featured: string;
  photoAdded: string;
  photoLimit: string;
  photoRemoved: string;
  removePhoto: string;
  unfeature: string;
  unfeatured: string;
  uploading: string;
};

export function EntryOwnerTools({
  entryId,
  isDraft,
  isFeatured,
  labels,
}: {
  entryId: string;
  isDraft: boolean;
  isFeatured: boolean;
  labels: OwnerToolsLabels;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  function toggleFeatured() {
    startTransition(async () => {
      const result = await setFeaturedPortfolioEntry(isFeatured ? null : entryId);

      if (!result.ok) {
        notify({ message: labels.errors[result.code], variant: "error" });
        return;
      }

      notify({
        message: isFeatured ? labels.unfeatured : labels.featured,
        variant: "success",
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!isDraft ? (
        <button
          className="btn btn-secondary"
          disabled={pending}
          onClick={toggleFeatured}
          type="button"
        >
          {isFeatured ? labels.unfeature : labels.feature}
        </button>
      ) : null}
      <form action={deletePortfolioEntryFromForm}>
        <input name="entryId" type="hidden" value={entryId} />
        <ConfirmSubmitButton
          cancelLabel={labels.cancel}
          className="btn btn-secondary"
          confirmDescription={labels.deleteConfirm}
          confirmLabel={labels.confirm}
          confirmTitle={labels.delete}
          pendingLabel={labels.deleting}
        >
          {labels.delete}
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}

/**
 * Re-encodes each photo as a JPEG of at most 1600px on the long side before
 * upload. That keeps files small and removes embedded metadata such as GPS.
 */
async function toUploadableJpeg(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85),
    );
  } catch {
    return null;
  }
}

export function PhotoManager({
  entryId,
  labels,
  photos,
}: {
  entryId: string;
  labels: OwnerToolsLabels;
  photos: { alt: string; path: string; src: string }[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const remaining = PORTFOLIO_MAX_PHOTOS - photos.length;

  async function upload(files: FileList | null) {
    if (!files?.length) return;

    setBusy(true);
    const supabase = createClient();

    for (const file of Array.from(files).slice(0, remaining)) {
      const blob = await toUploadableJpeg(file);

      if (!blob) {
        notify({ message: labels.errors.invalidImage, variant: "error" });
        continue;
      }

      if (blob.size > PORTFOLIO_PHOTO_MAX_BYTES) {
        notify({ message: labels.errors.tooLarge, variant: "error" });
        continue;
      }

      const prepared = await preparePortfolioPhotoUpload({
        entryId,
        mimeType: "image/jpeg",
        size: blob.size,
      });

      if (!prepared.ok || !prepared.path || !prepared.uploadToken) {
        notify({
          message: labels.errors[prepared.ok ? "uploadFailed" : prepared.code],
          variant: "error",
        });
        break;
      }

      const { error } = await supabase.storage
        .from(PORTFOLIO_MEDIA_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.uploadToken, blob, {
          contentType: "image/jpeg",
        });

      if (error) {
        await discardPortfolioPhotoUpload({ entryId, path: prepared.path });
        notify({ message: labels.errors.uploadFailed, variant: "error" });
        break;
      }

      const finalized = await finalizePortfolioPhotoUpload({
        entryId,
        path: prepared.path,
      });

      if (!finalized.ok) {
        notify({ message: labels.errors[finalized.code], variant: "error" });
        break;
      }

      notify({ message: labels.photoAdded, variant: "success" });
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function remove(path: string) {
    setBusy(true);
    const result = await removePortfolioPhoto({ entryId, path });
    setBusy(false);

    if (!result.ok) {
      notify({ message: labels.errors[result.code], variant: "error" });
      return;
    }

    notify({ message: labels.photoRemoved, variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {photos.length ? (
        <ul className="portfolio-photo-grid">
          {photos.map((photo) => (
            <li key={photo.path}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={photo.alt} src={photo.src} />
              <button
                className="btn btn-secondary min-h-9 px-3"
                disabled={busy}
                onClick={() => remove(photo.path)}
                type="button"
              >
                {labels.removePhoto}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {remaining > 0 ? (
        <label className={`btn btn-secondary w-fit ${busy ? "opacity-60" : ""}`}>
          {busy ? labels.uploading : labels.addPhotos}
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            multiple
            onChange={(event) => upload(event.target.files)}
            ref={inputRef}
            type="file"
          />
        </label>
      ) : null}
      <p className="text-sm text-[var(--muted)]">{labels.photoLimit}</p>
    </div>
  );
}

export function FeedbackForm({
  entryId,
  labels,
}: {
  entryId: string;
  labels: {
    errors: Record<string, string>;
    noteAdded: string;
    placeholder: string;
    send: string;
    sending: string;
    title: string;
  };
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await addPortfolioFeedback(entryId, text);

          if (!result.ok) {
            notify({ message: labels.errors[result.code], variant: "error" });
            return;
          }

          setText("");
          notify({ message: labels.noteAdded, variant: "success" });
          router.refresh();
        });
      }}
    >
      <label className="portfolio-field">
        <span>{labels.title}</span>
        <textarea
          className="min-h-24 rounded-md border px-3 py-2 text-base outline-none transition"
          maxLength={1000}
          onChange={(event) => setText(event.target.value)}
          placeholder={labels.placeholder}
          required
          value={text}
        />
      </label>
      <button className="btn btn-primary" disabled={pending || !text.trim()} type="submit">
        {pending ? labels.sending : labels.send}
      </button>
    </form>
  );
}
