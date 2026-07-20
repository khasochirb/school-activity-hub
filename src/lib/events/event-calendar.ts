import "server-only";
import { absoluteServerUrl } from "@/lib/server-url";

export type CalendarEvent = {
  createdAt: string;
  description: string | null;
  endsAt: string;
  id: string;
  location: string | null;
  organizerName?: string | null;
  scheduleChangeNotice: string | null;
  startsAt: string;
  title: string;
};

export function getEventCalendarLinks(
  event: Omit<CalendarEvent, "createdAt" | "organizerName">,
  baseUrl: string,
) {
  const detailUrl = absoluteServerUrl(baseUrl, `/events/${event.id}`);

  return {
    calendarDownloadUrl: `/events/${event.id}/calendar.ics`,
    googleCalendarUrl: buildGoogleCalendarUrl(event, detailUrl),
  };
}

export function buildIcsCalendar(
  event: CalendarEvent,
  detailUrl: string,
) {
  const description = [
    event.scheduleChangeNotice?.trim(),
    event.description?.trim(),
    detailUrl,
  ]
    .filter(Boolean)
    .join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//School Activity Hub//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@school-activity-hub`,
    `DTSTAMP:${formatIcsDate(event.createdAt)}`,
    `DTSTART:${formatIcsDate(event.startsAt)}`,
    `DTEND:${formatIcsDate(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(description ? [`DESCRIPTION:${escapeIcsText(description)}`] : []),
    ...(event.location
      ? [`LOCATION:${escapeIcsText(event.location)}`]
      : []),
    ...(event.organizerName
      ? [`X-SAH-ORGANIZER:${escapeIcsText(event.organizerName)}`]
      : []),
    `URL:${escapeIcsText(detailUrl)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function calendarFilename(title: string, eventId: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return `${slug || `event-${eventId.slice(0, 8)}`}.ics`;
}

function buildGoogleCalendarUrl(
  event: Omit<CalendarEvent, "createdAt" | "organizerName">,
  detailUrl: string,
) {
  const query = new URLSearchParams({
    action: "TEMPLATE",
    dates: `${formatGoogleDate(event.startsAt)}/${formatGoogleDate(event.endsAt)}`,
    details: [
      event.scheduleChangeNotice?.trim(),
      event.description?.trim(),
      detailUrl,
    ]
      .filter(Boolean)
      .join("\n\n"),
    location: event.location ?? "",
    text: event.title,
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

function formatIcsDate(value: string) {
  return formatUtcDate(value);
}

function formatGoogleDate(value: string) {
  return formatUtcDate(value);
}

function formatUtcDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid calendar event date");
  }

  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldIcsLine(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let limit = 75;

  for (const character of line) {
    if (encoder.encode(`${current}${character}`).length > limit && current) {
      parts.push(current);
      current = character;
      limit = 74;
    } else {
      current += character;
    }
  }

  if (current || !parts.length) {
    parts.push(current);
  }

  return parts.join("\r\n ");
}
