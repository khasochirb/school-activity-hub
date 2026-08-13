"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentClubActor } from "@/lib/auth/club-access";
import {
  CLUB_MEDIA_BUCKET,
  CLUB_MEDIA_RULES,
  buildClubMediaPath,
  inspectClubImage,
  isClubMediaKind,
  isClubMediaMimeType,
  isControlledClubMediaPath,
  type ClubMediaKind,
  type ClubMediaMimeType,
  type ClubMediaValidationCode,
} from "@/lib/clubs/club-media";
import { isUuid } from "@/lib/clubs/club-profile";
import { logServerError } from "@/lib/errors/server-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ClubMediaActionCode =
  | ClubMediaValidationCode
  | "editDenied"
  | "notFound"
  | "removeFailed"
  | "saveFailed"
  | "uploadFailed";

export type ClubMediaActionResult =
  | {
      code?: never;
      ok: true;
      path?: string;
      uploadToken?: string;
      version?: string;
    }
  | { code: ClubMediaActionCode; ok: false };

type ClubMediaAccess = {
  actorId: string;
  clubId: string;
  role: string;
  schoolId: string;
};

export async function prepareClubMediaUpload(input: {
  clubId: string;
  kind: ClubMediaKind;
  mimeType: ClubMediaMimeType;
  size: number;
}): Promise<ClubMediaActionResult> {
  if (
    !isUuid(input.clubId) ||
    !isClubMediaKind(input.kind) ||
    !isClubMediaMimeType(input.mimeType)
  ) {
    return { code: "invalidType", ok: false };
  }

  if (
    !Number.isSafeInteger(input.size) ||
    input.size < 1 ||
    input.size > CLUB_MEDIA_RULES[input.kind].maxBytes
  ) {
    return { code: "tooLarge", ok: false };
  }

  const access = await getClubMediaAccess(input.clubId);

  if (!access) {
    return { code: "editDenied", ok: false };
  }

  await removeStaleClubMedia(access, input.kind);

  const path = buildClubMediaPath(
    access.schoolId,
    access.clubId,
    input.kind,
    input.mimeType,
    randomUUID(),
  );
  const admin = createAdminClient();
  const { data: signedUpload, error: signedUploadError } = await admin.storage
    .from(CLUB_MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });

  if (signedUploadError || !signedUpload?.token) {
    logServerError(
      "Club media signed upload preparation failed",
      signedUploadError,
      {
        clubId: access.clubId,
        kind: input.kind,
        role: access.role,
      },
    );
    return { code: "uploadFailed", ok: false };
  }

  return { ok: true, path, uploadToken: signedUpload.token };
}

export async function finalizeClubMediaUpload(input: {
  clubId: string;
  kind: ClubMediaKind;
  path: string;
}): Promise<ClubMediaActionResult> {
  const access = await getClubMediaAccess(input.clubId);

  if (
    !access ||
    !isClubMediaKind(input.kind) ||
    !isControlledClubMediaPath(
      input.path,
      access.schoolId,
      access.clubId,
      input.kind,
    )
  ) {
    return { code: "editDenied", ok: false };
  }

  const admin = createAdminClient();
  const expectedMimeType = getPathMimeType(input.path);

  if (!expectedMimeType) {
    await removeExactObject(input.path);
    return { code: "invalidType", ok: false };
  }

  const { data: image, error: downloadError } = await admin.storage
    .from(CLUB_MEDIA_BUCKET)
    .download(input.path);

  if (downloadError || !image) {
    logServerError("Club media validation download failed", downloadError, {
      clubId: access.clubId,
      kind: input.kind,
      role: access.role,
    });
    return { code: "uploadFailed", ok: false };
  }

  if (image.type && image.type.toLowerCase() !== expectedMimeType) {
    await removeExactObject(input.path);
    return { code: "mimeMismatch", ok: false };
  }

  const inspection = inspectClubImage(
    await image.arrayBuffer(),
    expectedMimeType,
    input.kind,
  );

  if (!inspection.ok) {
    await removeExactObject(input.path);
    return inspection;
  }

  const { data: previousPath, error: updateError } = await admin.rpc(
    "set_club_profile_media",
    {
      actor_profile_id: access.actorId,
      media_kind: input.kind,
      media_path: input.path,
      target_club_id: access.clubId,
    },
  );

  if (updateError) {
    await removeExactObject(input.path);
    logServerError("Club media reference update failed", updateError, {
      clubId: access.clubId,
      kind: input.kind,
      role: access.role,
    });
    return { code: "saveFailed", ok: false };
  }

  if (
    typeof previousPath === "string" &&
    previousPath !== input.path &&
    isControlledClubMediaPath(
      previousPath,
      access.schoolId,
      access.clubId,
      input.kind,
    )
  ) {
    await removeExactObject(previousPath);
  }

  revalidateClubMedia(access.clubId);

  return { ok: true, version: Date.now().toString() };
}

export async function removeClubMedia(input: {
  clubId: string;
  kind: ClubMediaKind;
}): Promise<ClubMediaActionResult> {
  const access = await getClubMediaAccess(input.clubId);

  if (!access || !isClubMediaKind(input.kind)) {
    return { code: "editDenied", ok: false };
  }

  const admin = createAdminClient();
  const { data: previousPath, error } = await admin.rpc(
    "set_club_profile_media",
    {
      actor_profile_id: access.actorId,
      media_kind: input.kind,
      media_path: null,
      target_club_id: access.clubId,
    },
  );

  if (error) {
    logServerError("Club media removal failed", error, {
      clubId: access.clubId,
      kind: input.kind,
      role: access.role,
    });
    return { code: "removeFailed", ok: false };
  }

  if (
    typeof previousPath === "string" &&
    isControlledClubMediaPath(
      previousPath,
      access.schoolId,
      access.clubId,
      input.kind,
    )
  ) {
    await removeExactObject(previousPath);
  }

  revalidateClubMedia(access.clubId);

  return { ok: true, version: Date.now().toString() };
}

export async function discardClubMediaUpload(input: {
  clubId: string;
  kind: ClubMediaKind;
  path: string;
}): Promise<void> {
  const access = await getClubMediaAccess(input.clubId);

  if (
    !access ||
    !isClubMediaKind(input.kind) ||
    !isControlledClubMediaPath(
      input.path,
      access.schoolId,
      access.clubId,
      input.kind,
    )
  ) {
    return;
  }

  const admin = createAdminClient();
  const column = input.kind === "logo" ? "logo_path" : "banner_path";
  const { data: profile } = await admin
    .from("club_profiles")
    .select(column)
    .eq("club_id", access.clubId)
    .maybeSingle<Record<string, string | null>>();

  if (profile?.[column] !== input.path) {
    await removeExactObject(input.path);
  }
}

async function getClubMediaAccess(
  clubId: string,
): Promise<ClubMediaAccess | null> {
  if (!isUuid(clubId)) {
    return null;
  }

  const actor = await getCurrentClubActor();

  if (!actor || (!actor.profile && !actor.isPlatformAdmin)) {
    return null;
  }

  const supabase = await createClient();
  const [{ data: club }, { data: canEdit, error: accessError }] =
    await Promise.all([
      supabase
        .from("clubs")
        .select("id, school_id")
        .eq("id", clubId)
        .maybeSingle<{ id: string; school_id: string }>(),
      supabase.rpc("current_user_can_edit_club_profile", {
        target_club_id: clubId,
      }),
    ]);

  if (accessError || !club || canEdit !== true) {
    if (accessError) {
      logServerError("Club media authorization failed", accessError, {
        clubId,
        isPlatformAdmin: actor.isPlatformAdmin,
        role: actor.profile?.role,
      });
    }

    return null;
  }

  return {
    actorId: actor.userId,
    clubId: club.id,
    role: actor.isPlatformAdmin ? "platform_admin" : (actor.profile?.role ?? "unknown"),
    schoolId: club.school_id,
  };
}

async function removeStaleClubMedia(
  access: ClubMediaAccess,
  kind: ClubMediaKind,
) {
  const admin = createAdminClient();
  const prefix = `${access.schoolId}/${access.clubId}/${kind}`;
  const column = kind === "logo" ? "logo_path" : "banner_path";
  const [{ data: files }, { data: profile }] = await Promise.all([
    admin.storage.from(CLUB_MEDIA_BUCKET).list(prefix, {
      limit: 100,
      sortBy: { column: "created_at", order: "asc" },
    }),
    admin
      .from("club_profiles")
      .select(column)
      .eq("club_id", access.clubId)
      .maybeSingle<Record<string, string | null>>(),
  ]);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const stalePaths = (files ?? [])
    .filter((file) => {
      const path = `${prefix}/${file.name}`;
      const createdAt = file.created_at ? Date.parse(file.created_at) : NaN;

      return (
        path !== profile?.[column] &&
        Number.isFinite(createdAt) &&
        createdAt < cutoff &&
        isControlledClubMediaPath(
          path,
          access.schoolId,
          access.clubId,
          kind,
        )
      );
    })
    .map((file) => `${prefix}/${file.name}`);

  if (stalePaths.length) {
    await admin.storage.from(CLUB_MEDIA_BUCKET).remove(stalePaths);
  }
}

async function removeExactObject(path: string) {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(CLUB_MEDIA_BUCKET).remove([path]);

  if (error) {
    logServerError("Club media cleanup failed", error);
  }
}

function getPathMimeType(path: string): ClubMediaMimeType | null {
  if (path.endsWith(".jpg")) {
    return "image/jpeg";
  }

  if (path.endsWith(".png")) {
    return "image/png";
  }

  return path.endsWith(".webp") ? "image/webp" : null;
}

function revalidateClubMedia(clubId: string) {
  revalidatePath("/clubs");
  revalidatePath(`/clubs/${clubId}`);
  revalidatePath(`/clubs/${clubId}/edit`);
}
