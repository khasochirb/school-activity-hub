"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { logServerError } from "@/lib/errors/server-error";
import {
  PORTFOLIO_BODY_MAX,
  PORTFOLIO_ENTRY_SELECT,
  PORTFOLIO_FEEDBACK_MAX,
  PORTFOLIO_MAX_PHOTOS,
  PORTFOLIO_MEDIA_BUCKET,
  PORTFOLIO_PHOTO_MAX_BYTES,
  PORTFOLIO_TITLE_MAX,
  buildPortfolioMediaPath,
  inspectPortfolioPhoto,
  isControlledPortfolioMediaPath,
  isPortfolioKind,
  isPortfolioPhotoMimeType,
  isPortfolioVisibility,
  isUuidValue,
  portfolioPhotoContentType,
  type PortfolioEntry,
  type PortfolioPhotoCheck,
  type PortfolioPhotoMimeType,
} from "@/lib/portfolio/portfolio";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PortfolioActionCode =
  | PortfolioPhotoCheck
  | "denied"
  | "invalid"
  | "saveFailed"
  | "tooManyPhotos"
  | "uploadFailed";

export type PortfolioActionResult =
  | { ok: true; id?: string; path?: string; uploadToken?: string }
  | { ok: false; code: PortfolioActionCode };

export type PortfolioEntryInput = {
  body: string;
  clubId: string | null;
  entryDate: string;
  eventId: string | null;
  id: string | null;
  isDraft: boolean;
  kind: string;
  title: string;
  visibility: string;
};

export async function savePortfolioEntry(
  input: PortfolioEntryInput,
): Promise<PortfolioActionResult> {
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();

  if (
    !title ||
    title.length > PORTFOLIO_TITLE_MAX ||
    body.length > PORTFOLIO_BODY_MAX ||
    !isPortfolioKind(input.kind) ||
    !isPortfolioVisibility(input.visibility) ||
    (input.id !== null && !isUuidValue(input.id)) ||
    (input.clubId !== null && !isUuidValue(input.clubId)) ||
    (input.eventId !== null && !isUuidValue(input.eventId)) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)
  ) {
    return { code: "invalid", ok: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_portfolio_entry", {
    entry_body: body || null,
    entry_club_id: input.clubId,
    entry_event_id: input.eventId,
    entry_is_draft: Boolean(input.isDraft),
    entry_kind: input.kind,
    entry_on: input.entryDate,
    entry_title: title,
    entry_visibility: input.visibility,
    target_entry_id: input.id,
  });

  if (error || typeof data !== "string") {
    logServerError("Portfolio entry save failed", error, {
      isNew: input.id === null,
    });
    return {
      code: error?.code === "42501" ? "denied" : "saveFailed",
      ok: false,
    };
  }

  revalidatePortfolio(data);
  return { id: data, ok: true };
}

export async function deletePortfolioEntry(
  entryId: string,
): Promise<PortfolioActionResult> {
  if (!isUuidValue(entryId)) return { code: "invalid", ok: false };

  const supabase = await createClient();
  const { data: owned } = await supabase
    .from("portfolio_entries")
    .select(PORTFOLIO_ENTRY_SELECT)
    .eq("id", entryId)
    .maybeSingle<PortfolioEntry>();
  const { data: removedPaths, error } = await supabase.rpc(
    "delete_portfolio_entry",
    { target_entry_id: entryId },
  );

  if (error) {
    logServerError("Portfolio entry delete failed", error);
    return { code: error.code === "42501" ? "denied" : "saveFailed", ok: false };
  }

  if (owned && Array.isArray(removedPaths)) {
    await removeObjects(
      removedPaths.filter((path) =>
        isControlledPortfolioMediaPath(
          path,
          owned.school_id,
          owned.student_roster_id,
          owned.id,
        ),
      ),
    );
  }

  revalidatePortfolio(entryId);
  return { ok: true };
}

export async function setFeaturedPortfolioEntry(
  entryId: string | null,
): Promise<PortfolioActionResult> {
  if (entryId !== null && !isUuidValue(entryId)) {
    return { code: "invalid", ok: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_featured_portfolio_entry", {
    target_entry_id: entryId,
  });

  if (error) {
    logServerError("Portfolio feature failed", error);
    return { code: error.code === "42501" ? "denied" : "saveFailed", ok: false };
  }

  revalidatePortfolio(entryId);
  return { ok: true };
}

export async function addPortfolioFeedback(
  entryId: string,
  body: string,
): Promise<PortfolioActionResult> {
  const text = String(body ?? "").trim();

  if (!isUuidValue(entryId) || !text || text.length > PORTFOLIO_FEEDBACK_MAX) {
    return { code: "invalid", ok: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_portfolio_feedback", {
    feedback_body: text,
    target_entry_id: entryId,
  });

  if (error) {
    logServerError("Portfolio feedback failed", error);
    return { code: error.code === "42501" ? "denied" : "saveFailed", ok: false };
  }

  revalidatePortfolio(entryId);
  return { id: String(data), ok: true };
}

export async function preparePortfolioPhotoUpload(input: {
  entryId: string;
  mimeType: PortfolioPhotoMimeType;
  size: number;
}): Promise<PortfolioActionResult> {
  if (!isPortfolioPhotoMimeType(input.mimeType)) {
    return { code: "invalidType", ok: false };
  }

  if (
    !Number.isSafeInteger(input.size) ||
    input.size < 1 ||
    input.size > PORTFOLIO_PHOTO_MAX_BYTES
  ) {
    return { code: "tooLarge", ok: false };
  }

  const owned = await getOwnedEntry(input.entryId);

  if (!owned) return { code: "denied", ok: false };
  if (owned.entry.media_paths.length >= PORTFOLIO_MAX_PHOTOS) {
    return { code: "tooManyPhotos", ok: false };
  }

  const path = buildPortfolioMediaPath(
    owned.entry.school_id,
    owned.entry.student_roster_id,
    owned.entry.id,
    input.mimeType,
    randomUUID(),
  );
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(PORTFOLIO_MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data?.token) {
    logServerError("Portfolio photo upload preparation failed", error);
    return { code: "uploadFailed", ok: false };
  }

  return { ok: true, path, uploadToken: data.token };
}

export async function finalizePortfolioPhotoUpload(input: {
  entryId: string;
  path: string;
}): Promise<PortfolioActionResult> {
  const owned = await getOwnedEntry(input.entryId);

  if (
    !owned ||
    !isControlledPortfolioMediaPath(
      input.path,
      owned.entry.school_id,
      owned.entry.student_roster_id,
      owned.entry.id,
    )
  ) {
    return { code: "denied", ok: false };
  }

  const admin = createAdminClient();
  const { data: file, error: downloadError } = await admin.storage
    .from(PORTFOLIO_MEDIA_BUCKET)
    .download(input.path);

  if (downloadError || !file) {
    logServerError("Portfolio photo validation download failed", downloadError);
    return { code: "uploadFailed", ok: false };
  }

  const inspection = inspectPortfolioPhoto(
    await file.arrayBuffer(),
    portfolioPhotoContentType(input.path),
  );

  if (!inspection.ok) {
    await removeObjects([input.path]);
    return inspection;
  }

  const nextPaths = [...owned.entry.media_paths, input.path];

  if (nextPaths.length > PORTFOLIO_MAX_PHOTOS) {
    await removeObjects([input.path]);
    return { code: "tooManyPhotos", ok: false };
  }

  const { error } = await admin.rpc("set_portfolio_entry_media", {
    actor_profile_id: owned.userId,
    new_media_paths: nextPaths,
    target_entry_id: owned.entry.id,
  });

  if (error) {
    await removeObjects([input.path]);
    logServerError("Portfolio photo reference update failed", error);
    return { code: "saveFailed", ok: false };
  }

  revalidatePortfolio(owned.entry.id);
  return { ok: true };
}

export async function removePortfolioPhoto(input: {
  entryId: string;
  path: string;
}): Promise<PortfolioActionResult> {
  const owned = await getOwnedEntry(input.entryId);

  if (!owned || !owned.entry.media_paths.includes(input.path)) {
    return { code: "denied", ok: false };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("set_portfolio_entry_media", {
    actor_profile_id: owned.userId,
    new_media_paths: owned.entry.media_paths.filter((p) => p !== input.path),
    target_entry_id: owned.entry.id,
  });

  if (error) {
    logServerError("Portfolio photo removal failed", error);
    return { code: "saveFailed", ok: false };
  }

  if (
    isControlledPortfolioMediaPath(
      input.path,
      owned.entry.school_id,
      owned.entry.student_roster_id,
      owned.entry.id,
    )
  ) {
    await removeObjects([input.path]);
  }

  revalidatePortfolio(owned.entry.id);
  return { ok: true };
}

/** Removes an uploaded file that was never attached (e.g. upload failed). */
export async function discardPortfolioPhotoUpload(input: {
  entryId: string;
  path: string;
}): Promise<void> {
  const owned = await getOwnedEntry(input.entryId);

  if (
    owned &&
    !owned.entry.media_paths.includes(input.path) &&
    isControlledPortfolioMediaPath(
      input.path,
      owned.entry.school_id,
      owned.entry.student_roster_id,
      owned.entry.id,
    )
  ) {
    await removeObjects([input.path]);
  }
}

async function getOwnedEntry(entryId: string) {
  if (!isUuidValue(entryId)) return null;

  const user = await getCurrentUser();

  if (!user) return null;

  const supabase = await createClient();
  const [{ data: owns, error: ownsError }, { data: entry }] = await Promise.all([
    supabase.rpc("current_user_owns_portfolio_entry", {
      target_entry_id: entryId,
    }),
    supabase
      .from("portfolio_entries")
      .select(PORTFOLIO_ENTRY_SELECT)
      .eq("id", entryId)
      .maybeSingle<PortfolioEntry>(),
  ]);

  if (ownsError) {
    logServerError("Portfolio ownership check failed", ownsError);
  }

  if (owns !== true || !entry) return null;

  return { entry, userId: user.id };
}

async function removeObjects(paths: string[]) {
  if (!paths.length) return;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(PORTFOLIO_MEDIA_BUCKET).remove(paths);

  if (error) logServerError("Portfolio photo cleanup failed", error);
}

function revalidatePortfolio(entryId: string | null) {
  revalidatePath("/portfolio");
  if (entryId) revalidatePath(`/portfolio/entries/${entryId}`);
}
