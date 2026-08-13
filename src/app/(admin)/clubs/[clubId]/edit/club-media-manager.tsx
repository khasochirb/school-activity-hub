"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast-provider";
import {
  CLUB_MEDIA_BUCKET,
  inspectClubImage,
  type ClubMediaKind,
  type ClubMediaValidationCode,
} from "@/lib/clubs/club-media";
import { createClient } from "@/lib/supabase/client";
import {
  discardClubMediaUpload,
  finalizeClubMediaUpload,
  prepareClubMediaUpload,
  removeClubMedia,
  type ClubMediaActionCode,
} from "./media-actions";

type ClubMediaLabels = {
  banner: string;
  bannerAlt: string;
  bannerRequirements: string;
  cancel: string;
  confirmDescription: string;
  confirmRemove: string;
  description: string;
  errors: Record<ClubMediaActionCode, string>;
  guidance: string;
  logo: string;
  logoAlt: string;
  logoRequirements: string;
  ratioWarning: string;
  remove: string;
  removed: string;
  removing: string;
  replace: string;
  title: string;
  upload: string;
  uploaded: string;
  uploading: string;
};

type MediaUrlOverride = {
  propUrl: string | null;
  value: string | null;
};

export function ClubMediaManager({
  bannerUrl,
  clubId,
  clubName,
  labels,
  logoUrl,
  themeClass,
}: {
  bannerUrl: string | null;
  clubId: string;
  clubName: string;
  labels: ClubMediaLabels;
  logoUrl: string | null;
  themeClass: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [pendingKind, setPendingKind] = useState<ClubMediaKind | null>(null);
  const [pendingOperation, setPendingOperation] = useState<
    "remove" | "upload" | null
  >(null);
  const [confirmKind, setConfirmKind] = useState<ClubMediaKind | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [bannerUrlOverride, setBannerUrlOverride] =
    useState<MediaUrlOverride | null>(null);
  const [logoUrlOverride, setLogoUrlOverride] =
    useState<MediaUrlOverride | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const currentBannerUrl =
    bannerUrlOverride?.propUrl === bannerUrl
      ? bannerUrlOverride.value
      : bannerUrl;
  const currentLogoUrl =
    logoUrlOverride?.propUrl === logoUrl ? logoUrlOverride.value : logoUrl;

  async function upload(kind: ClubMediaKind, file: File | undefined) {
    if (!file || pendingKind) {
      return;
    }

    setPendingKind(kind);
    setPendingOperation("upload");

    try {
      const inspection = inspectClubImage(await file.arrayBuffer(), file.type, kind);

      if (!inspection.ok) {
        showError(inspection.code);
        return;
      }

      if (inspection.ratioWarning) {
        toast.notify({
          message: labels.ratioWarning,
          title: toast.labels.warning,
          variant: "warning",
        });
      }

      const prepared = await prepareClubMediaUpload({
        clubId,
        kind,
        mimeType: inspection.mimeType,
        size: file.size,
      });

      if (!prepared.ok || !prepared.path || !prepared.uploadToken) {
        showError(prepared.ok ? "uploadFailed" : prepared.code);
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from(CLUB_MEDIA_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.uploadToken, file, {
          cacheControl: "3600",
          contentType: inspection.mimeType,
        });

      if (uploadError) {
        await discardClubMediaUpload({ clubId, kind, path: prepared.path });
        showError("uploadFailed");
        return;
      }

      const finalized = await finalizeClubMediaUpload({
        clubId,
        kind,
        path: prepared.path,
      });

      if (!finalized.ok) {
        showError(finalized.code);
        return;
      }

      if (!finalized.version) {
        showError("saveFailed");
        return;
      }

      toast.notify({
        message: labels.uploaded,
        title: toast.labels.success,
        variant: "success",
      });
      const nextUrl = `/clubs/${clubId}/media/${kind}?v=${encodeURIComponent(
        finalized.version,
      )}`;
      setFailedImages((current) => {
        const next = new Set(current);
        next.delete(nextUrl);
        return next;
      });
      if (kind === "logo") {
        setLogoUrlOverride({ propUrl: logoUrl, value: nextUrl });
      } else {
        setBannerUrlOverride({ propUrl: bannerUrl, value: nextUrl });
      }
      router.refresh();
    } catch {
      showError("uploadFailed");
    } finally {
      setPendingKind(null);
      setPendingOperation(null);
      resetInput(kind);
    }
  }

  async function confirmRemoval() {
    if (!confirmKind || pendingKind) {
      return;
    }

    const kind = confirmKind;
    setConfirmKind(null);
    setPendingKind(kind);
    setPendingOperation("remove");

    try {
      const result = await removeClubMedia({ clubId, kind });

      if (!result.ok) {
        showError(result.code);
        return;
      }

      toast.notify({
        message: labels.removed,
        title: toast.labels.success,
        variant: "success",
      });
      if (kind === "logo") {
        setLogoUrlOverride({ propUrl: logoUrl, value: null });
      } else {
        setBannerUrlOverride({ propUrl: bannerUrl, value: null });
      }
      router.refresh();
    } catch {
      showError("removeFailed");
    } finally {
      setPendingKind(null);
      setPendingOperation(null);
    }
  }

  function showError(code: ClubMediaActionCode | ClubMediaValidationCode) {
    toast.notify({
      message: labels.errors[code] ?? labels.errors.uploadFailed,
      title: toast.labels.error,
      variant: "error",
    });
  }

  function resetInput(kind: ClubMediaKind) {
    const input = kind === "logo" ? logoInputRef.current : bannerInputRef.current;

    if (input) {
      input.value = "";
    }
  }

  function imageFailed(url: string) {
    setFailedImages((current) => new Set(current).add(url));
  }

  return (
    <section className="section-card section-card-padded max-w-5xl">
      <div className="max-w-3xl">
        <h2 className="section-title">{labels.title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{labels.description}</p>
        <p className="notice-box notice-info mt-3 text-sm leading-6">
          {labels.guidance}
        </p>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)]">
        <MediaEditorCard
          alt={labels.logoAlt}
          confirmKind={confirmKind}
          failed={Boolean(
            currentLogoUrl && failedImages.has(currentLogoUrl),
          )}
          imageUrl={currentLogoUrl}
          inputRef={logoInputRef}
          kind="logo"
          labels={labels}
          onCancelRemove={() => setConfirmKind(null)}
          onConfirmRemove={confirmRemoval}
          onImageError={imageFailed}
          onRemove={() => setConfirmKind("logo")}
          onUpload={upload}
          pendingKind={pendingKind}
          pendingOperation={pendingOperation}
          requirements={labels.logoRequirements}
          themeClass={themeClass}
          title={labels.logo}
        >
          {clubName.slice(0, 2).toUpperCase()}
        </MediaEditorCard>

        <MediaEditorCard
          alt={labels.bannerAlt}
          confirmKind={confirmKind}
          failed={Boolean(
            currentBannerUrl && failedImages.has(currentBannerUrl),
          )}
          imageUrl={currentBannerUrl}
          inputRef={bannerInputRef}
          kind="banner"
          labels={labels}
          onCancelRemove={() => setConfirmKind(null)}
          onConfirmRemove={confirmRemoval}
          onImageError={imageFailed}
          onRemove={() => setConfirmKind("banner")}
          onUpload={upload}
          pendingKind={pendingKind}
          pendingOperation={pendingOperation}
          requirements={labels.bannerRequirements}
          themeClass={themeClass}
          title={labels.banner}
        />
      </div>
    </section>
  );
}

function MediaEditorCard({
  alt,
  children,
  confirmKind,
  failed,
  imageUrl,
  inputRef,
  kind,
  labels,
  onCancelRemove,
  onConfirmRemove,
  onImageError,
  onRemove,
  onUpload,
  pendingKind,
  pendingOperation,
  requirements,
  themeClass,
  title,
}: {
  alt: string;
  children?: React.ReactNode;
  confirmKind: ClubMediaKind | null;
  failed: boolean;
  imageUrl: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  kind: ClubMediaKind;
  labels: ClubMediaLabels;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  onImageError: (url: string) => void;
  onRemove: () => void;
  onUpload: (kind: ClubMediaKind, file: File | undefined) => void;
  pendingKind: ClubMediaKind | null;
  pendingOperation: "remove" | "upload" | null;
  requirements: string;
  themeClass: string;
  title: string;
}) {
  const isRemoving = pendingKind === kind && pendingOperation === "remove";
  const isUploading = pendingKind === kind && pendingOperation === "upload";
  const hasImage = Boolean(imageUrl && !failed);

  return (
    <article className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-3 sm:p-4">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div
        className={`relative mt-3 overflow-hidden rounded-lg border border-[var(--border)] ${
          kind === "logo" ? "aspect-square max-w-56" : "aspect-[3/1] w-full"
        } ${themeClass}`}
      >
        {hasImage && imageUrl ? (
          <Image
            alt={alt}
            className="object-cover"
            fill
            onError={() => onImageError(imageUrl)}
            sizes={kind === "logo" ? "224px" : "(max-width: 1024px) 100vw, 640px"}
            src={imageUrl}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-2xl font-black text-slate-800" role="img" aria-label={alt}>
            {children ?? title}
          </div>
        )}
      </div>
      <p className="mt-3 break-words text-xs leading-5 text-slate-500">
        {requirements}
      </p>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={Boolean(pendingKind)}
        onChange={(event) => onUpload(kind, event.target.files?.[0])}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          aria-busy={isUploading}
          className="btn btn-primary min-h-10"
          disabled={Boolean(pendingKind)}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {isUploading ? labels.uploading : hasImage ? labels.replace : labels.upload}
        </button>
        {hasImage ? (
          <button
            className="btn btn-secondary min-h-10"
            disabled={Boolean(pendingKind)}
            onClick={onRemove}
            type="button"
          >
            {isRemoving ? labels.removing : labels.remove}
          </button>
        ) : null}
      </div>

      {confirmKind === kind ? (
        <div
          aria-label={labels.confirmRemove}
          className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900/60 dark:bg-red-950/30"
          role="group"
        >
          <p className="leading-6 text-red-900 dark:text-red-100">
            {labels.confirmDescription}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-secondary min-h-10" onClick={onCancelRemove} type="button">
              {labels.cancel}
            </button>
            <button className="btn min-h-10 border-red-700 bg-red-700 text-white hover:bg-red-800" onClick={onConfirmRemove} type="button">
              {labels.confirmRemove}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
