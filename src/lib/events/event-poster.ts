import {
  CLUB_MEDIA_MIME_EXTENSIONS,
  detectStaticImage,
  isClubMediaMimeType,
  type ClubMediaMimeType,
} from "@/lib/clubs/club-media";

export const EVENT_POSTER_BUCKET = "event-media";
export const EVENT_POSTER_MAX_BYTES = 5 * 1024 * 1024;
export const EVENT_POSTER_MIN_WIDTH = 800;
export const EVENT_POSTER_MIN_HEIGHT = 1000;

export type EventPosterValidationCode =
  | "animated"
  | "dimensions"
  | "invalidImage"
  | "invalidType"
  | "mimeMismatch"
  | "tooLarge";

export type EventPosterInspection =
  | {
      height: number;
      mimeType: ClubMediaMimeType;
      ok: true;
      width: number;
    }
  | { code: EventPosterValidationCode; ok: false };

export function buildEventPosterPath(
  schoolId: string,
  eventId: string,
  mimeType: ClubMediaMimeType,
  fileId: string,
) {
  return `${schoolId}/${eventId}/poster/${fileId}.${CLUB_MEDIA_MIME_EXTENSIONS[mimeType]}`;
}

export function isControlledEventPosterPath(
  path: string,
  schoolId: string,
  eventId: string,
) {
  const pattern = new RegExp(
    `^${escapeRegExp(schoolId)}/${escapeRegExp(eventId)}/poster/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(jpg|png|webp)$`,
  );

  return pattern.test(path);
}

export function inspectEventPoster(
  input: ArrayBuffer | Uint8Array,
  claimedMimeType: string,
): EventPosterInspection {
  if (!isClubMediaMimeType(claimedMimeType)) {
    return { code: "invalidType", ok: false };
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (bytes.byteLength > EVENT_POSTER_MAX_BYTES) {
    return { code: "tooLarge", ok: false };
  }

  const detected = detectStaticImage(bytes);

  if (!detected) {
    return { code: "invalidImage", ok: false };
  }

  if (detected.mimeType !== claimedMimeType) {
    return { code: "mimeMismatch", ok: false };
  }

  if (detected.animated) {
    return { code: "animated", ok: false };
  }

  if (
    detected.width < EVENT_POSTER_MIN_WIDTH ||
    detected.height < EVENT_POSTER_MIN_HEIGHT
  ) {
    return { code: "dimensions", ok: false };
  }

  return {
    height: detected.height,
    mimeType: detected.mimeType,
    ok: true,
    width: detected.width,
  };
}

export function getEventPosterMimeType(path: string): ClubMediaMimeType | null {
  if (path.endsWith(".jpg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  return path.endsWith(".webp") ? "image/webp" : null;
}

export function getEventPosterDeliveryUrl(eventId: string, path: string) {
  const version = path.split("/").at(-1);
  const baseUrl = `/events/${eventId}/poster`;

  return version
    ? `${baseUrl}?v=${encodeURIComponent(version)}`
    : baseUrl;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
