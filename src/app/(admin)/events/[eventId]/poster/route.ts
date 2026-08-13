import { getCurrentEventActor } from "@/lib/auth/event-access";
import { isUuid } from "@/lib/clubs/club-profile";
import {
  EVENT_POSTER_BUCKET,
  getEventPosterMimeType,
  isControlledEventPosterPath,
} from "@/lib/events/event-poster";
import { logServerError } from "@/lib/errors/server-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type EventPosterRecord = {
  poster_path: string | null;
  school_id: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;

  if (!isUuid(eventId)) return notFoundResponse();

  const actor = await getCurrentEventActor();

  if (!actor || (!actor.profile && !actor.isPlatformAdmin)) {
    return notFoundResponse();
  }

  const supabase = await createClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("school_id, poster_path")
    .eq("id", eventId)
    .maybeSingle<EventPosterRecord>();

  if (error || !event?.poster_path) {
    if (error) {
      logServerError("Event poster reference lookup failed", error, { eventId });
    }
    return notFoundResponse();
  }

  const path = event.poster_path;

  if (!isControlledEventPosterPath(path, event.school_id, eventId)) {
    return notFoundResponse();
  }

  const { data: canRead, error: canReadError } = await supabase.rpc(
    "current_user_can_read_event_poster",
    { object_name: path },
  );

  if (canReadError || canRead !== true) {
    if (canReadError) {
      logServerError("Event poster read authorization failed", canReadError, {
        eventId,
      });
    }
    return notFoundResponse();
  }

  const admin = createAdminClient();
  let { data: image, error: downloadError } = await admin.storage
    .from(EVENT_POSTER_BUCKET)
    .download(path, {
      transform: {
        format: "origin",
        height: 800,
        quality: 82,
        resize: "cover",
        width: 640,
      },
    });

  if (downloadError || !image) {
    ({ data: image, error: downloadError } = await admin.storage
      .from(EVENT_POSTER_BUCKET)
      .download(path));
  }

  if (downloadError || !image) {
    logServerError("Event poster download failed", downloadError, { eventId });
    return notFoundResponse();
  }

  const mimeType = getEventPosterMimeType(path);
  if (!mimeType) return notFoundResponse();

  return new Response(await image.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": mimeType,
      "X-Content-Type-Options": "nosniff",
    },
    status: 200,
  });
}

function notFoundResponse() {
  return new Response(null, {
    headers: { "Cache-Control": "private, no-store" },
    status: 404,
  });
}
