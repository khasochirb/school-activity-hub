"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_BUCKET,
  ATTACHMENT_MAX_BYTES,
  attachmentTypeFromName,
} from "@/lib/attachments/attachments";
import { createClient } from "@/lib/supabase/client";
import {
  discardAttachmentUpload,
  finalizeAttachmentUpload,
  prepareAttachmentUpload,
  type AttachmentActionCode,
} from "./actions";

export type AttachmentUploaderLabels = {
  add: string;
  errors: Record<AttachmentActionCode, string>;
  hint: string;
  uploading: string;
};

// "Add file": picks a PDF or Word file and uploads it straight to storage
// with a one-time link from the server, which then checks it.
export function AttachmentUploader({
  labels,
  ownerId,
  ownerType,
}: {
  labels: AttachmentUploaderLabels;
  ownerId: string;
  ownerType: "announcement" | "club" | "event";
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    const mimeType = attachmentTypeFromName(file.name);

    if (!mimeType) return setError(labels.errors.invalidType);
    if (file.size > ATTACHMENT_MAX_BYTES) return setError(labels.errors.tooLarge);

    setBusy(true);

    try {
      const prepared = await prepareAttachmentUpload({ mimeType, ownerId, ownerType, size: file.size });

      if (!prepared.ok || !prepared.path || !prepared.uploadToken) {
        setError(labels.errors[prepared.ok ? "uploadFailed" : prepared.code]);
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.uploadToken, file, { contentType: mimeType });

      if (uploadError) {
        await discardAttachmentUpload({ ownerId, ownerType, path: prepared.path });
        setError(labels.errors.uploadFailed);
        return;
      }

      const finalized = await finalizeAttachmentUpload({ fileName: file.name, ownerId, ownerType, path: prepared.path });

      if (!finalized.ok) {
        setError(labels.errors[finalized.code]);
        return;
      }

      router.refresh();
    } catch {
      setError(labels.errors.uploadFailed);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="attach-upload">
      <label className="btn btn-secondary min-h-10" data-busy={busy || undefined}>
        <input
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void upload(file);
          }}
          ref={input}
          type="file"
        />
        {busy ? labels.uploading : `+ ${labels.add}`}
      </label>
      <span className="attach-hint">{labels.hint}</span>
      {error ? (
        <p className="attach-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
