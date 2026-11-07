import { detectStaticImage } from "@/lib/clubs/club-media";

export const PORTFOLIO_MEDIA_BUCKET = "portfolio-media";
export const PORTFOLIO_MAX_PHOTOS = 6;
export const PORTFOLIO_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PORTFOLIO_PHOTO_MIN_SIDE = 200;
export const PORTFOLIO_TITLE_MAX = 140;
export const PORTFOLIO_BODY_MAX = 5000;
export const PORTFOLIO_FEEDBACK_MAX = 1000;

export const PORTFOLIO_KINDS = [
  "reflection",
  "project",
  "achievement",
  "photos",
] as const;
export const PORTFOLIO_VISIBILITIES = ["private", "staff", "school"] as const;

export type PortfolioKind = (typeof PORTFOLIO_KINDS)[number];
export type PortfolioVisibility = (typeof PORTFOLIO_VISIBILITIES)[number];
export type PortfolioViewAs = "me" | "teacher" | "classmate";

export type PortfolioEntry = {
  body: string | null;
  club_id: string | null;
  created_at: string;
  entry_date: string;
  event_id: string | null;
  id: string;
  is_draft: boolean;
  is_featured: boolean;
  kind: PortfolioKind;
  media_paths: string[];
  school_id: string;
  student_roster_id: string;
  title: string;
  visibility: PortfolioVisibility;
};

export const PORTFOLIO_ENTRY_SELECT =
  "id, school_id, student_roster_id, kind, title, body, entry_date, club_id, event_id, visibility, is_draft, is_featured, media_paths, created_at";

const PHOTO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type PortfolioPhotoMimeType = keyof typeof PHOTO_EXTENSIONS;

export type PortfolioPhotoCheck =
  | "animated"
  | "dimensions"
  | "invalidImage"
  | "invalidType"
  | "mimeMismatch"
  | "tooLarge";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidValue(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isPortfolioKind(value: unknown): value is PortfolioKind {
  return PORTFOLIO_KINDS.includes(value as PortfolioKind);
}

export function isPortfolioVisibility(
  value: unknown,
): value is PortfolioVisibility {
  return PORTFOLIO_VISIBILITIES.includes(value as PortfolioVisibility);
}

export function isPortfolioPhotoMimeType(
  value: unknown,
): value is PortfolioPhotoMimeType {
  return typeof value === "string" && value in PHOTO_EXTENSIONS;
}

export function buildPortfolioMediaPath(
  schoolId: string,
  rosterId: string,
  entryId: string,
  mimeType: PortfolioPhotoMimeType,
  fileId: string,
) {
  return `${schoolId}/${rosterId}/${entryId}/${fileId}.${PHOTO_EXTENSIONS[mimeType]}`;
}

/** Mirrors public.portfolio_media_path_is_valid in the database. */
export function isControlledPortfolioMediaPath(
  path: unknown,
  schoolId: string,
  rosterId: string,
  entryId: string,
) {
  if (
    typeof path !== "string" ||
    !isUuidValue(schoolId) ||
    !isUuidValue(rosterId) ||
    !isUuidValue(entryId)
  ) {
    return false;
  }

  return new RegExp(
    `^${schoolId}/${rosterId}/${entryId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`,
  ).test(path);
}

export function portfolioPhotoContentType(path: string) {
  if (path.endsWith(".jpg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  return "image/webp";
}

export function inspectPortfolioPhoto(
  input: ArrayBuffer | Uint8Array,
  claimedMimeType: string,
): { ok: true } | { code: PortfolioPhotoCheck; ok: false } {
  if (!isPortfolioPhotoMimeType(claimedMimeType)) {
    return { code: "invalidType", ok: false };
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (bytes.byteLength > PORTFOLIO_PHOTO_MAX_BYTES) {
    return { code: "tooLarge", ok: false };
  }

  const detected = detectStaticImage(bytes);

  if (!detected) return { code: "invalidImage", ok: false };
  if (detected.mimeType !== claimedMimeType) {
    return { code: "mimeMismatch", ok: false };
  }
  if (detected.animated) return { code: "animated", ok: false };
  if (
    detected.width < PORTFOLIO_PHOTO_MIN_SIDE ||
    detected.height < PORTFOLIO_PHOTO_MIN_SIDE
  ) {
    return { code: "dimensions", ok: false };
  }

  return { ok: true };
}

/** Which entries a viewer would see; used for the "View as" preview. */
export function entryVisibleAs(entry: PortfolioEntry, viewAs: PortfolioViewAs) {
  if (viewAs === "me") return true;
  if (entry.is_draft) return false;
  if (viewAs === "teacher") return entry.visibility !== "private";
  return entry.visibility === "school";
}
