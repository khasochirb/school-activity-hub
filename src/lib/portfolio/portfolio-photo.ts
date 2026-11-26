import { detectStaticImage } from "@/lib/clubs/club-media";
import {
  PORTFOLIO_PHOTO_MAX_BYTES,
  PORTFOLIO_PHOTO_MIN_SIDE,
  isPortfolioPhotoMimeType,
  type PortfolioPhotoCheck,
} from "./portfolio";

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
