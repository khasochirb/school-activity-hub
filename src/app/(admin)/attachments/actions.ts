"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAttachmentAccess } from "@/lib/attachments/attachment-access";
import {
  ATTACHMENT_BUCKET,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_PER_OWNER,
  buildAttachmentPath,
  cleanAttachmentName,
  isAttachmentMimeType,
  isAttachmentOwnerType,
  isControlledAttachmentPath,
  sniffAttachmentType,
  type AttachmentMimeType,
  type AttachmentOwnerType,
} from "@/lib/attachments/attachments";
import { isUuid } from "@/lib/clubs/club-profile";
import { logServerError } from "@/lib/errors/server-error";
import { createAdminClient } from "@/lib/supabase/admin";

export type AttachmentActionCode =
  | "denied"
  | "invalidType"
  | "tooLarge"
  | "tooMany"
  | "uploadFailed"
  | "saveFailed";

export type AttachmentActionResult =
  | { code?: never; ok: true; path?: string; uploadToken?: string }
  | { code: AttachmentActionCode; ok: false };

type Owner = { ownerId: string; ownerType: AttachmentOwnerType };

function validOwner(input: { ownerId: unknown; ownerType: unknown }): input is Owner {
  return isAttachmentOwnerType(input.ownerType) && typeof input.ownerId === "string" && isUuid(input.ownerId);
}

function ownerPaths(owner: Owner) {
  return owner.ownerType === "club"
    ? [`/clubs/${owner.ownerId}`]
    : owner.ownerType === "event"
      ? [`/events/${owner.ownerId}`]
      : ["/announcements", "/dashboard"];
}

// Step 1: check the person may add files here, then hand out a one-time
// upload link for a new, server-chosen path.
export async function prepareAttachmentUpload(input: {
  mimeType: string;
  ownerId: string;
  ownerType: string;
  size: number;
}): Promise<AttachmentActionResult> {
  if (!validOwner(input)) return { code: "denied", ok: false };
  if (!isAttachmentMimeType(input.mimeType)) return { code: "invalidType", ok: false };
  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > ATTACHMENT_MAX_BYTES) {
    return { code: "tooLarge", ok: false };
  }

  const access = await getAttachmentAccess(input.ownerType, input.ownerId);

  if (!access?.canManage) return { code: "denied", ok: false };

  const admin = createAdminClient();
  const { count } = await admin
    .from("attachments")
    .select("id", { count: "exact", head: true })
    .eq("owner_type", input.ownerType)
    .eq("owner_id", input.ownerId);

  if ((count ?? 0) >= ATTACHMENT_MAX_PER_OWNER) return { code: "tooMany", ok: false };

  const path = buildAttachmentPath(
    access.schoolId,
    input.ownerType,
    input.ownerId,
    randomUUID(),
    input.mimeType as AttachmentMimeType,
  );
  const { data, error } = await admin.storage.from(ATTACHMENT_BUCKET).createSignedUploadUrl(path, { upsert: false });

  if (error || !data?.token) {
    logServerError("Attachment upload preparation failed", error, { ownerType: input.ownerType });
    return { code: "uploadFailed", ok: false };
  }

  return { ok: true, path, uploadToken: data.token };
}

// Step 2: the file is in storage. Check again who is asking, that the path is
// the one we handed out, and that the bytes really are a PDF or Word file;
// then record it. Anything wrong removes the file.
export async function finalizeAttachmentUpload(input: {
  fileName: string;
  ownerId: string;
  ownerType: string;
  path: string;
}): Promise<AttachmentActionResult> {
  if (!validOwner(input)) return { code: "denied", ok: false };

  const access = await getAttachmentAccess(input.ownerType, input.ownerId);

  if (!access?.canManage || !isControlledAttachmentPath(input.path, access.schoolId, input.ownerType, input.ownerId)) {
    return { code: "denied", ok: false };
  }

  const admin = createAdminClient();
  const bucket = admin.storage.from(ATTACHMENT_BUCKET);
  const { data: file, error: downloadError } = await bucket.download(input.path);

  if (downloadError || !file) {
    logServerError("Attachment check download failed", downloadError, { ownerType: input.ownerType });
    return { code: "uploadFailed", ok: false };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffAttachmentType(bytes);
  const extension = input.path.split(".").pop();
  const matchesPath =
    mimeType &&
    (mimeType === "application/pdf" ? extension === "pdf" : extension === "doc" || extension === "docx");

  if (!mimeType || !matchesPath || bytes.byteLength > ATTACHMENT_MAX_BYTES) {
    await bucket.remove([input.path]);
    return { code: bytes.byteLength > ATTACHMENT_MAX_BYTES ? "tooLarge" : "invalidType", ok: false };
  }

  const { error } = await admin.from("attachments").insert({
    content_type: mimeType,
    file_name: cleanAttachmentName(input.fileName, mimeType),
    owner_id: input.ownerId,
    owner_type: input.ownerType,
    school_id: access.schoolId,
    size_bytes: bytes.byteLength,
    storage_path: input.path,
    uploaded_by_profile_id: access.actorId,
  });

  if (error) {
    await bucket.remove([input.path]);
    logServerError("Attachment record failed", error, { ownerType: input.ownerType });
    return { code: "saveFailed", ok: false };
  }

  ownerPaths(input).forEach((path) => revalidatePath(path));

  return { ok: true };
}

// An upload that failed half-way: remove the stray file, if it is ours.
export async function discardAttachmentUpload(input: { ownerId: string; ownerType: string; path: string }) {
  if (!validOwner(input)) return;

  const access = await getAttachmentAccess(input.ownerType, input.ownerId);

  if (access?.canManage && isControlledAttachmentPath(input.path, access.schoolId, input.ownerType, input.ownerId)) {
    await createAdminClient().storage.from(ATTACHMENT_BUCKET).remove([input.path]);
  }
}

export async function deleteAttachment(formData: FormData) {
  const id = String(formData.get("attachment_id") ?? "");

  if (!isUuid(id)) return;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("attachments")
    .select("id, owner_type, owner_id, storage_path")
    .eq("id", id)
    .maybeSingle<{ id: string; owner_id: string; owner_type: AttachmentOwnerType; storage_path: string }>();

  if (!row) return;

  const access = await getAttachmentAccess(row.owner_type, row.owner_id);

  if (!access?.canManage) return;

  await admin.from("attachments").delete().eq("id", row.id);
  await admin.storage.from(ATTACHMENT_BUCKET).remove([row.storage_path]);
  ownerPaths({ ownerId: row.owner_id, ownerType: row.owner_type }).forEach((path) => revalidatePath(path));
}
