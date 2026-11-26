import {
  CLUB_MEDIA_MIME_EXTENSIONS,
  detectStaticImage,
  isClubMediaMimeType,
  type ClubMediaMimeType,
  type ClubMediaValidationCode,
} from "@/lib/clubs/club-media";

// One optional cover photo per school site page. Stored in a private bucket;
// the public site serves it through /s/<school>/<page>/cover.
export const SITE_COVER_BUCKET = "site-media";
export const SITE_COVER_MAX_BYTES = 5 * 1024 * 1024;
export const SITE_COVER_MIN_WIDTH = 1000;
export const SITE_COVER_MIN_HEIGHT = 560;

export type SiteCoverInspection =
  | { height: number; mimeType: ClubMediaMimeType; ok: true; width: number }
  | { code: ClubMediaValidationCode; ok: false };

const FILE_ID = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function buildSiteCoverPath(
  schoolId: string,
  pageId: string,
  mimeType: ClubMediaMimeType,
  fileId: string,
) {
  return `${schoolId}/${pageId}/cover/${fileId}.${CLUB_MEDIA_MIME_EXTENSIONS[mimeType]}`;
}

export function isControlledSiteCoverPath(path: string, schoolId: string, pageId: string) {
  return new RegExp(
    `^${escapeRegExp(schoolId)}/${escapeRegExp(pageId)}/cover/${FILE_ID}\\.(jpg|png|webp)$`,
  ).test(path);
}

export function inspectSiteCover(
  input: ArrayBuffer | Uint8Array,
  claimedMimeType: string,
): SiteCoverInspection {
  if (!isClubMediaMimeType(claimedMimeType)) {
    return { code: "invalidType", ok: false };
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (bytes.byteLength > SITE_COVER_MAX_BYTES) {
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

  if (detected.width < SITE_COVER_MIN_WIDTH || detected.height < SITE_COVER_MIN_HEIGHT) {
    return { code: "dimensions", ok: false };
  }

  return { height: detected.height, mimeType: detected.mimeType, ok: true, width: detected.width };
}

export function getSiteCoverMimeType(path: string): ClubMediaMimeType | null {
  if (path.endsWith(".jpg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  return path.endsWith(".webp") ? "image/webp" : null;
}

// The file name changes on every upload, so it doubles as a cache-busting version.
export function siteCoverUrl(schoolSlug: string, pageSlug: string, coverPath: string | null) {
  if (!coverPath) return null;

  const version = coverPath.split("/").at(-1) ?? "";

  return `/s/${schoolSlug}/${pageSlug}/cover?v=${encodeURIComponent(version)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
