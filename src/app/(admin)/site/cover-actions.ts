"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isClubMediaMimeType, type ClubMediaMimeType, type ClubMediaValidationCode } from "@/lib/clubs/club-media";
import { logServerError } from "@/lib/errors/server-error";
import {
  SITE_COVER_BUCKET,
  SITE_COVER_MAX_BYTES,
  buildSiteCoverPath,
  getSiteCoverMimeType,
  inspectSiteCover,
  isControlledSiteCoverPath,
} from "@/lib/site/site-cover";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SiteCoverActionCode = ClubMediaValidationCode | "editDenied" | "removeFailed" | "saveFailed" | "uploadFailed";

export type SiteCoverActionResult =
  | { ok: true; path?: string; uploadToken?: string; url?: string | null }
  | { code: SiteCoverActionCode; ok: false };

type CoverAccess = { coverPath: string | null; pageId: string; schoolId: string; schoolSlug: string; slug: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Staff of the page's school only. The page is read through the signed-in
// client, so row-level security on school_pages applies as well.
async function getCoverAccess(pageId: string): Promise<CoverAccess | null> {
  if (!UUID.test(pageId)) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, schools(slug)")
    .eq("id", user.id)
    .eq("status", "active")
    .in("role", ["school_admin", "teacher"])
    .maybeSingle<{ school_id: string; schools: { slug: string } | null }>();

  if (!profile?.schools) return null;

  const { data: page } = await supabase
    .from("school_pages")
    .select("id, school_id, slug, cover_path")
    .eq("id", pageId)
    .eq("school_id", profile.school_id)
    .maybeSingle<{ cover_path: string | null; id: string; school_id: string; slug: string }>();

  if (!page) return null;

  return {
    coverPath: page.cover_path,
    pageId: page.id,
    schoolId: page.school_id,
    schoolSlug: profile.schools.slug,
    slug: page.slug,
  };
}

export async function prepareSiteCoverUpload(input: {
  mimeType: ClubMediaMimeType;
  pageId: string;
  size: number;
}): Promise<SiteCoverActionResult> {
  if (!isClubMediaMimeType(input.mimeType)) return { code: "invalidType", ok: false };

  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > SITE_COVER_MAX_BYTES) {
    return { code: "tooLarge", ok: false };
  }

  const access = await getCoverAccess(input.pageId);

  if (!access) return { code: "editDenied", ok: false };

  const path = buildSiteCoverPath(access.schoolId, access.pageId, input.mimeType, randomUUID());
  const { data, error } = await createAdminClient()
    .storage.from(SITE_COVER_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data?.token) {
    logServerError("Site cover signed upload preparation failed", error, { pageId: access.pageId });
    return { code: "uploadFailed", ok: false };
  }

  return { ok: true, path, uploadToken: data.token };
}

export async function finalizeSiteCoverUpload(input: { pageId: string; path: string }): Promise<SiteCoverActionResult> {
  const access = await getCoverAccess(input.pageId);

  if (!access || !isControlledSiteCoverPath(input.path, access.schoolId, access.pageId)) {
    return { code: "editDenied", ok: false };
  }

  const expected = getSiteCoverMimeType(input.path);
  const admin = createAdminClient();
  const { data: image, error: downloadError } = await admin.storage.from(SITE_COVER_BUCKET).download(input.path);

  if (downloadError || !image || !expected) {
    await removeObject(input.path);
    return { code: "uploadFailed", ok: false };
  }

  // Check the uploaded bytes, not the browser's claim.
  const inspection = inspectSiteCover(await image.arrayBuffer(), expected);

  if (!inspection.ok) {
    await removeObject(input.path);
    return inspection;
  }

  const { error: updateError } = await admin
    .from("school_pages")
    .update({ cover_path: input.path, updated_at: new Date().toISOString() })
    .eq("id", access.pageId)
    .eq("school_id", access.schoolId);

  if (updateError) {
    await removeObject(input.path);
    logServerError("Site cover reference update failed", updateError, { pageId: access.pageId });
    return { code: "saveFailed", ok: false };
  }

  if (access.coverPath && access.coverPath !== input.path && isControlledSiteCoverPath(access.coverPath, access.schoolId, access.pageId)) {
    await removeObject(access.coverPath);
  }

  revalidateSite(access);
  return { ok: true, url: `/s/${access.schoolSlug}/${access.slug}/cover?v=${encodeURIComponent(input.path.split("/").at(-1) ?? "")}` };
}

export async function removeSiteCover(input: { pageId: string }): Promise<SiteCoverActionResult> {
  const access = await getCoverAccess(input.pageId);

  if (!access) return { code: "editDenied", ok: false };

  const { error } = await createAdminClient()
    .from("school_pages")
    .update({ cover_path: null, updated_at: new Date().toISOString() })
    .eq("id", access.pageId)
    .eq("school_id", access.schoolId);

  if (error) {
    logServerError("Site cover removal failed", error, { pageId: access.pageId });
    return { code: "removeFailed", ok: false };
  }

  if (access.coverPath && isControlledSiteCoverPath(access.coverPath, access.schoolId, access.pageId)) {
    await removeObject(access.coverPath);
  }

  revalidateSite(access);
  return { ok: true, url: null };
}

export async function discardSiteCoverUpload(input: { pageId: string; path: string }): Promise<void> {
  const access = await getCoverAccess(input.pageId);

  if (access && access.coverPath !== input.path && isControlledSiteCoverPath(input.path, access.schoolId, access.pageId)) {
    await removeObject(input.path);
  }
}

async function removeObject(path: string) {
  const { error } = await createAdminClient().storage.from(SITE_COVER_BUCKET).remove([path]);

  if (error) logServerError("Site cover cleanup failed", error);
}

function revalidateSite(access: CoverAccess) {
  revalidatePath("/site");
  revalidatePath(`/site/${access.pageId}`);
  revalidatePath(`/s/${access.schoolSlug}`, "layout");
}
