import {
  buildIcsCalendar,
  calendarFilename,
  type CalendarEvent,
} from "@/lib/events/event-calendar";
import { getCurrentEventActor } from "@/lib/auth/event-access";
import { EVENT_CALENDAR_EXPORT_SELECT } from "@/lib/events/event-selects";
import { canViewEvent } from "@/lib/events/event-visibility";
import { absoluteServerUrl, getServerBaseUrl } from "@/lib/server-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  role: "school_admin" | "student" | "teacher";
  school_id: string;
};

type CalendarEventRecord = CalendarEvent & {
  school_id: string;
  status: string;
};

type Connection = {
  receiver_school_id: string;
  requester_school_id: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const actor = await getCurrentEventActor();

  if (!actor) {
    return new Response("Authentication required", { status: 401 });
  }

  const profile = actor.profile as Profile | null;

  if (!profile && !actor.isPlatformAdmin) {
    return new Response("Event not found", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: rawEvent } = await supabase
    .from("events")
    .select(EVENT_CALENDAR_EXPORT_SELECT)
    .eq("id", eventId)
    .maybeSingle<{
      created_at: string;
      description: string | null;
      ends_at: string;
      id: string;
      location: string | null;
      school_id: string;
      starts_at: string;
      status: string;
      title: string;
    }>();

  if (!rawEvent) {
    return new Response("Event not found", { status: 404 });
  }

  if (actor.isPlatformAdmin) {
    const { data: school } = await admin
      .from("schools")
      .select("name")
      .eq("id", rawEvent.school_id)
      .maybeSingle<{ name: string }>();
    return buildCalendarResponse(rawEvent, school?.name ?? null, await getServerBaseUrl());
  }

  if (!profile) {
    return new Response("Event not found", { status: 404 });
  }

  const [{ data: connections }, { data: shares }] = await Promise.all([
    admin
      .from("school_connections")
      .select("requester_school_id, receiver_school_id")
      .eq("status", "approved")
      .or(
        `requester_school_id.eq.${profile.school_id},receiver_school_id.eq.${profile.school_id}`,
      )
      .returns<Connection[]>(),
    admin
      .from("event_school_shares")
      .select("school_id")
      .eq("event_id", eventId)
      .returns<Array<{ school_id: string }>>(),
  ]);
  const connectedSchoolIds = (connections ?? []).map((connection) =>
    connection.requester_school_id === profile.school_id
      ? connection.receiver_school_id
      : connection.requester_school_id,
  );
  const sharedSchoolIds = (shares ?? []).map((share) => share.school_id);

  if (
    !canViewEvent({
      connectedSchoolIds,
      event: rawEvent,
      profile,
      sharedSchoolIds,
    })
  ) {
    return new Response("Event not found", { status: 404 });
  }

  const { data: school } = await admin
    .from("schools")
    .select("name")
    .eq("id", rawEvent.school_id)
    .maybeSingle<{ name: string }>();
  return buildCalendarResponse(rawEvent, school?.name ?? null, await getServerBaseUrl());
}

function buildCalendarResponse(
  rawEvent: {
    created_at: string;
    description: string | null;
    ends_at: string;
    id: string;
    location: string | null;
    school_id: string;
    starts_at: string;
    status: string;
    title: string;
  },
  schoolName: string | null,
  baseUrl: string,
) {
  const event: CalendarEventRecord = {
    createdAt: rawEvent.created_at,
    description: rawEvent.description,
    endsAt: rawEvent.ends_at,
    id: rawEvent.id,
    location: rawEvent.location,
    organizerName: schoolName,
    school_id: rawEvent.school_id,
    startsAt: rawEvent.starts_at,
    status: rawEvent.status,
    title: rawEvent.title,
  };
  const detailUrl = absoluteServerUrl(baseUrl, `/events/${event.id}`);
  const filename = calendarFilename(event.title, event.id);

  return new Response(buildIcsCalendar(event, detailUrl), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
}
