"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast-provider";
import {
  EVENT_POSTER_BUCKET,
  inspectEventPoster,
  type EventPosterValidationCode,
} from "@/lib/events/event-poster";
import { createClient } from "@/lib/supabase/client";
import {
  discardEventPosterUpload,
  finalizeEventPosterUpload,
  prepareEventPosterUpload,
  removeEventPoster,
  type EventPosterActionCode,
} from "@/app/(admin)/events/poster-actions";

export type EventPosterLabels = {
  alt: string;
  cancel: string;
  confirmDescription: string;
  confirmRemove: string;
  createdWithoutPoster: string;
  description: string;
  errors: Record<EventPosterActionCode, string>;
  guidance: string;
  noPoster: string;
  openEvent: string;
  remove: string;
  removed: string;
  removing: string;
  replace: string;
  requirements: string;
  retry: string;
  selected: string;
  title: string;
  upload: string;
  uploaded: string;
  uploading: string;
};

type UrlOverride = {
  propUrl: string | null;
  value: string | null;
};

export function EventPosterUploader({
  currentPosterUrl,
  deferUntilEventCreated = false,
  eventId,
  eventTitle,
  labels,
}: {
  currentPosterUrl: string | null;
  deferUntilEventCreated?: boolean;
  eventId: string | null;
  eventTitle: string;
  labels: EventPosterLabels;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const attemptedEventRef = useRef<string | null>(null);
  const uploadToEventRef = useRef<
    (eventId: string, file: File, fromCreation: boolean) => Promise<void>
  >(async () => undefined);
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<"remove" | "upload" | null>(null);
  const [posterUrlOverride, setPosterUrlOverride] =
    useState<UrlOverride | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [creationUploadFailed, setCreationUploadFailed] = useState(false);
  const currentPoster =
    posterUrlOverride?.propUrl === currentPosterUrl
      ? posterUrlOverride.value
      : currentPosterUrl;
  const visiblePoster = stagedPreviewUrl ?? currentPoster;
  const imageFailed = visiblePoster === failedUrl;

  useEffect(() => {
    return () => {
      if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl);
    };
  }, [stagedPreviewUrl]);

  async function chooseFile(file: File | undefined) {
    if (!file || pending) return;

    const inspection = inspectEventPoster(await file.arrayBuffer(), file.type);

    if (!inspection.ok) {
      showError(inspection.code);
      resetInput();
      return;
    }

    setCreationUploadFailed(false);
    setStagedFile(file);
    setStagedPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });

    if (!deferUntilEventCreated && eventId) {
      await uploadToEvent(eventId, file, false);
    }
  }

  async function uploadToEvent(
    targetEventId: string,
    file: File,
    fromCreation: boolean,
  ) {
    if (pending) return;
    setPending("upload");

    try {
      const inspection = inspectEventPoster(await file.arrayBuffer(), file.type);
      if (!inspection.ok) {
        showError(inspection.code);
        return;
      }

      const prepared = await prepareEventPosterUpload({
        eventId: targetEventId,
        mimeType: inspection.mimeType,
        size: file.size,
      });

      if (!prepared.ok || !prepared.path || !prepared.uploadToken) {
        handleUploadFailure(
          prepared.ok ? "uploadFailed" : prepared.code,
          fromCreation,
        );
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from(EVENT_POSTER_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.uploadToken, file, {
          cacheControl: "3600",
          contentType: inspection.mimeType,
        });

      if (uploadError) {
        await discardEventPosterUpload({
          eventId: targetEventId,
          path: prepared.path,
        });
        handleUploadFailure("uploadFailed", fromCreation);
        return;
      }

      const finalized = await finalizeEventPosterUpload({
        eventId: targetEventId,
        path: prepared.path,
      });

      if (!finalized.ok || !finalized.version) {
        handleUploadFailure(
          finalized.ok ? "saveFailed" : finalized.code,
          fromCreation,
        );
        return;
      }

      const nextUrl = `/events/${targetEventId}/poster?v=${encodeURIComponent(
        finalized.version,
      )}`;
      setPosterUrlOverride({ propUrl: currentPosterUrl, value: nextUrl });
      setFailedUrl(null);
      clearStagedFile();
      setCreationUploadFailed(false);
      toast.notify({
        message: labels.uploaded,
        title: toast.labels.success,
        variant: "success",
      });
    } catch {
      handleUploadFailure("uploadFailed", fromCreation);
    } finally {
      setPending(null);
      resetInput();
    }
  }

  useEffect(() => {
    uploadToEventRef.current = uploadToEvent;
  });

  useEffect(() => {
    if (
      !deferUntilEventCreated ||
      !eventId ||
      !stagedFile ||
      attemptedEventRef.current === eventId
    ) {
      return;
    }

    attemptedEventRef.current = eventId;
    void uploadToEventRef.current(eventId, stagedFile, true);
  }, [deferUntilEventCreated, eventId, stagedFile]);

  async function confirmPosterRemoval() {
    if (!eventId || pending) return;
    setConfirmRemove(false);
    setPending("remove");

    try {
      const result = await removeEventPoster({ eventId });
      if (!result.ok) {
        showError(result.code);
        return;
      }
      setPosterUrlOverride({ propUrl: currentPosterUrl, value: null });
      setFailedUrl(null);
      toast.notify({
        message: labels.removed,
        title: toast.labels.success,
        variant: "success",
      });
    } catch {
      showError("removeFailed");
    } finally {
      setPending(null);
    }
  }

  function handleUploadFailure(
    code: EventPosterActionCode | EventPosterValidationCode,
    fromCreation: boolean,
  ) {
    if (fromCreation) setCreationUploadFailed(true);
    showError(code);
  }

  function showError(code: EventPosterActionCode | EventPosterValidationCode) {
    toast.notify({
      message: labels.errors[code] ?? labels.errors.uploadFailed,
      title: toast.labels.error,
      variant: "error",
    });
  }

  function clearStagedFile() {
    setStagedFile(null);
    setStagedPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-3 sm:p-4">
      <div className="max-w-2xl">
        <h3 className="text-sm font-bold text-slate-900">{labels.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{labels.description}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">{labels.guidance}</p>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
        <div className="relative aspect-[4/5] w-full max-w-48 overflow-hidden rounded-lg border border-[var(--border)] bg-[linear-gradient(145deg,#f8d8b4,#f2af68_55%,#7c3f25)]">
          {visiblePoster && !imageFailed ? (
            <Image
              alt={labels.alt.replace("{event}", eventTitle)}
              className="object-cover"
              fill
              onError={() => setFailedUrl(visiblePoster)}
              sizes="192px"
              src={visiblePoster}
              unoptimized
            />
          ) : (
            <div
              aria-label={labels.noPoster}
              className="flex h-full items-center justify-center px-4 text-center text-sm font-bold text-slate-950"
              role="img"
            >
              {labels.noPoster}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="break-words text-xs leading-5 text-slate-500">
            {labels.requirements}
          </p>
          {stagedFile && !eventId ? (
            <p className="mt-2 break-words text-sm font-semibold text-slate-700">
              {labels.selected}: {stagedFile.name}
            </p>
          ) : null}

          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={Boolean(pending)}
            onChange={(event) => void chooseFile(event.target.files?.[0])}
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
              {pending === "upload"
                ? labels.uploading
                : currentPoster || stagedFile
                  ? labels.replace
                  : labels.upload}
            </button>
            {stagedFile && !eventId ? (
              <button
                className="btn btn-secondary min-h-10"
                onClick={clearStagedFile}
                type="button"
              >
                {labels.remove}
              </button>
            ) : currentPoster && eventId ? (
              <button
                className="btn btn-secondary min-h-10"
                disabled={Boolean(pending)}
                onClick={() => setConfirmRemove(true)}
                type="button"
              >
                {pending === "remove" ? labels.removing : labels.remove}
              </button>
            ) : null}
          </div>

          {creationUploadFailed && eventId && stagedFile ? (
            <div className="notice-box notice-warning mt-3 text-sm">
              <p>{labels.createdWithoutPoster}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn btn-primary min-h-10"
                  disabled={Boolean(pending)}
                  onClick={() => {
                    attemptedEventRef.current = null;
                    void uploadToEvent(eventId, stagedFile, true);
                  }}
                  type="button"
                >
                  {labels.retry}
                </button>
                <Link className="btn btn-secondary min-h-10" href={`/events/${eventId}`}>
                  {labels.openEvent}
                </Link>
              </div>
            </div>
          ) : null}

          {confirmRemove ? (
            <div
              aria-label={labels.confirmRemove}
              className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm dark:border-red-900/60 dark:bg-red-950/30"
              role="group"
            >
              <p className="leading-6 text-red-900 dark:text-red-100">
                {labels.confirmDescription}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn btn-secondary min-h-10"
                  onClick={() => setConfirmRemove(false)}
                  type="button"
                >
                  {labels.cancel}
                </button>
                <button
                  className="btn min-h-10 border-red-700 bg-red-700 text-white hover:bg-red-800"
                  onClick={() => void confirmPosterRemoval()}
                  type="button"
                >
                  {labels.confirmRemove}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
