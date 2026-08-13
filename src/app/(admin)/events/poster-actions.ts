"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentEventActor } from "@/lib/auth/event-access";
import { isUuid } from "@/lib/clubs/club-profile";
import {
  EVENT_POSTER_BUCKET,
  EVENT_POSTER_MAX_BYTES,
  buildEventPosterPath,
  getEventPosterMimeType,
  inspectEventPoster,
  isControlledEventPosterPath,
  type EventPosterValidationCode,
} from "@/lib/events/event-poster";
import { isClubMediaMimeType, type ClubMediaMimeType } from "@/lib/clubs/club-media";
import { logServerError } from "@/lib/errors/server-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EventPosterActionCode =
  | EventPosterValidationCode
  | "editDenied"
  | "notFound"
  | "removeFailed"
  | "saveFailed"
  | "uploadFailed";

export type EventPosterActionResult =
  | {
      code?: never;
      ok: true;
      path?: string;
      uploadToken?: string;
      version?: string;
    }
  | { code: EventPosterActionCode; ok: false };

type EventPosterAccess = {
  actorId: string;
  eventId: string;
  posterPath: string | null;
  role: string;
  schoolId: string;
};

export async function prepareEventPosterUpload(input: {
  eventId: string;
  mimeType: ClubMediaMimeType;
  size: number;
}): Promise<EventPosterActionResult> {
  if (!isUuid(input.eventId) || !isClubMediaMimeType(input.mimeType)) {
    return { code: "invalidType", ok: false };
  }

  if (
    !Number.isSafeInteger(input.size) ||
    input.size < 1 ||
    input.size > EVENT_POSTER_MAX_BYTES
  ) {
    return { code: "tooLarge", ok: false };
  }

  const access = await getEventPosterAccess(input.eventId);

  if (!access) {
    return { code: "editDenied", ok: false };
  }

  await removeStaleEventPosters(access);

  const path = buildEventPosterPath(
    access.schoolId,
    access.eventId,
    input.mimeType,
    randomUUID(),
  );
  const admin = createAdminClient();
  const { data: signedUpload, error } = await admin.storage
    .from(EVENT_POSTER_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !signedUpload?.token) {
    logServerError("Event poster signed upload preparation failed", error, {
      eventId: access.eventId,
      role: access.role,
    });
    return { code: "uploadFailed", ok: false };
  }

  return { ok: true, path, uploadToken: signedUpload.token };
}

export async function finalizeEventPosterUpload(input: {
  eventId: string;
  path: string;
}): Promise<EventPosterActionResult> {
  const access = await getEventPosterAccess(input.eventId);

  if (
    !access ||
    !isControlledEventPosterPath(
      input.path,
      access.schoolId,
      access.eventId,
    )
  ) {
    return { code: "editDenied", ok: false };
  }

  const expectedMimeType = getEventPosterMimeType(input.path);

  if (!expectedMimeType) {
    await removeExactObject(input.path);
    return { code: "invalidType", ok: false };
  }

  const admin = createAdminClient();
  const { data: image, error: downloadError } = await admin.storage
    .from(EVENT_POSTER_BUCKET)
    .download(input.path);

  if (downloadError || !image) {
    logServerError("Event poster validation download failed", downloadError, {
      eventId: access.eventId,
      role: access.role,
    });
    return { code: "uploadFailed", ok: false };
  }

  if (image.type && image.type.toLowerCase() !== expectedMimeType) {
    await removeExactObject(input.path);
    return { code: "mimeMismatch", ok: false };
  }

  const inspection = inspectEventPoster(
    await image.arrayBuffer(),
    expectedMimeType,
  );

  if (!inspection.ok) {
    await removeExactObject(input.path);
    return inspection;
  }

  const { data: previousPath, error: updateError } = await admin.rpc(
    "set_event_poster",
    {
      actor_profile_id: access.actorId,
      media_path: input.path,
      target_event_id: access.eventId,
    },
  );

  if (updateError) {
    await removeExactObject(input.path);
    logServerError("Event poster reference update failed", updateError, {
      eventId: access.eventId,
      role: access.role,
    });
    return { code: "saveFailed", ok: false };
  }

  if (
    typeof previousPath === "string" &&
    previousPath !== input.path &&
    isControlledEventPosterPath(
      previousPath,
      access.schoolId,
      access.eventId,
    )
  ) {
    await removeExactObject(previousPath);
  }

  revalidateEventPoster(access.eventId);
  return { ok: true, version: Date.now().toString() };
}

export async function removeEventPoster(input: {
  eventId: string;
}): Promise<EventPosterActionResult> {
  const access = await getEventPosterAccess(input.eventId);

  if (!access) {
    return { code: "editDenied", ok: false };
  }

  const admin = createAdminClient();
  const { data: previousPath, error } = await admin.rpc("set_event_poster", {
    actor_profile_id: access.actorId,
    media_path: null,
    target_event_id: access.eventId,
  });

  if (error) {
    logServerError("Event poster removal failed", error, {
      eventId: access.eventId,
      role: access.role,
    });
    return { code: "removeFailed", ok: false };
  }

  if (
    typeof previousPath === "string" &&
    isControlledEventPosterPath(
      previousPath,
      access.schoolId,
      access.eventId,
    )
  ) {
    await removeExactObject(previousPath);
  }

  revalidateEventPoster(access.eventId);
  return { ok: true, version: Date.now().toString() };
}

export async function discardEventPosterUpload(input: {
  eventId: string;
  path: string;
}): Promise<void> {
  const access = await getEventPosterAccess(input.eventId);

  if (
    !access ||
    !isControlledEventPosterPath(
      input.path,
      access.schoolId,
      access.eventId,
    )
  ) {
    return;
  }

  if (access.posterPath !== input.path) {
    await removeExactObject(input.path);
  }
}

async function getEventPosterAccess(
  eventId: string,
): Promise<EventPosterAccess | null> {
  if (!isUuid(eventId)) return null;

  const actor = await getCurrentEventActor();

  if (!actor || (!actor.profile && !actor.isPlatformAdmin)) return null;

  const supabase = await createClient();
  const [{ data: event }, { data: canEdit, error: accessError }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, school_id, poster_path")
        .eq("id", eventId)
        .maybeSingle<{
          id: string;
          poster_path: string | null;
          school_id: string;
        }>(),
      supabase.rpc("current_user_can_edit_event_poster", {
        target_event_id: eventId,
      }),
    ]);

  if (accessError || canEdit !== true || !event) {
    if (accessError) {
      logServerError("Event poster authorization failed", accessError, {
        eventId,
        isPlatformAdmin: actor.isPlatformAdmin,
        role: actor.profile?.role,
      });
    }
    return null;
  }

  return {
    actorId: actor.userId,
    eventId: event.id,
    posterPath: event.poster_path,
    role: actor.isPlatformAdmin
      ? "platform_admin"
      : (actor.profile?.role ?? "unknown"),
    schoolId: event.school_id,
  };
}

async function removeStaleEventPosters(access: EventPosterAccess) {
  const admin = createAdminClient();
  const prefix = `${access.schoolId}/${access.eventId}/poster`;
  const { data: files } = await admin.storage.from(EVENT_POSTER_BUCKET).list(
    prefix,
    { limit: 100, sortBy: { column: "created_at", order: "asc" } },
  );
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const stalePaths = (files ?? [])
    .filter((file) => {
      const path = `${prefix}/${file.name}`;
      const createdAt = file.created_at ? Date.parse(file.created_at) : NaN;
      return (
        path !== access.posterPath &&
        Number.isFinite(createdAt) &&
        createdAt < cutoff &&
        isControlledEventPosterPath(path, access.schoolId, access.eventId)
      );
    })
    .map((file) => `${prefix}/${file.name}`);

  if (stalePaths.length) {
    await admin.storage.from(EVENT_POSTER_BUCKET).remove(stalePaths);
  }
}

async function removeExactObject(path: string) {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(EVENT_POSTER_BUCKET)
    .remove([path]);

  if (error) logServerError("Event poster cleanup failed", error);
}

function revalidateEventPoster(eventId: string) {
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}
