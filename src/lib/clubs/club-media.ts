export const CLUB_MEDIA_BUCKET = "club-media";

export const CLUB_MEDIA_RULES = {
  logo: {
    maxBytes: 2 * 1024 * 1024,
    minHeight: 256,
    minWidth: 256,
  },
  banner: {
    maxBytes: 5 * 1024 * 1024,
    minHeight: 400,
    minWidth: 1200,
  },
} as const;

export const CLUB_MEDIA_MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ClubMediaKind = keyof typeof CLUB_MEDIA_RULES;
export type ClubMediaMimeType = keyof typeof CLUB_MEDIA_MIME_EXTENSIONS;
export type ClubMediaValidationCode =
  | "animated"
  | "dimensions"
  | "invalidImage"
  | "invalidType"
  | "mimeMismatch"
  | "tooLarge";

export type ClubMediaInspection =
  | {
      height: number;
      mimeType: ClubMediaMimeType;
      ok: true;
      ratioWarning: boolean;
      width: number;
    }
  | { code: ClubMediaValidationCode; ok: false };

export type DetectedStaticImage = {
  animated: boolean;
  height: number;
  mimeType: ClubMediaMimeType;
  width: number;
};

export function isClubMediaKind(value: unknown): value is ClubMediaKind {
  return value === "logo" || value === "banner";
}

export function isClubMediaMimeType(
  value: unknown,
): value is ClubMediaMimeType {
  return typeof value === "string" && value in CLUB_MEDIA_MIME_EXTENSIONS;
}

export function buildClubMediaPath(
  schoolId: string,
  clubId: string,
  kind: ClubMediaKind,
  mimeType: ClubMediaMimeType,
  fileId: string,
) {
  return `${schoolId}/${clubId}/${kind}/${fileId}.${CLUB_MEDIA_MIME_EXTENSIONS[mimeType]}`;
}

export function isControlledClubMediaPath(
  path: string,
  schoolId: string,
  clubId: string,
  kind: ClubMediaKind,
) {
  const escapedSchoolId = escapeRegExp(schoolId);
  const escapedClubId = escapeRegExp(clubId);
  const pattern = new RegExp(
    `^${escapedSchoolId}/${escapedClubId}/${kind}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(jpg|png|webp)$`,
  );

  return pattern.test(path);
}

export function inspectClubImage(
  input: ArrayBuffer | Uint8Array,
  claimedMimeType: string,
  kind: ClubMediaKind,
): ClubMediaInspection {
  if (!isClubMediaMimeType(claimedMimeType)) {
    return { code: "invalidType", ok: false };
  }

  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (bytes.byteLength > CLUB_MEDIA_RULES[kind].maxBytes) {
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

  const rules = CLUB_MEDIA_RULES[kind];

  if (detected.width < rules.minWidth || detected.height < rules.minHeight) {
    return { code: "dimensions", ok: false };
  }

  return {
    ...detected,
    ok: true,
    ratioWarning:
      kind === "banner" && Math.abs(detected.width / detected.height - 3) > 0.35,
  };
}

export function detectStaticImage(
  bytes: Uint8Array,
): DetectedStaticImage | null {
  return detectPng(bytes) ?? detectJpeg(bytes) ?? detectWebp(bytes);
}

function detectPng(bytes: Uint8Array): DetectedStaticImage | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];

  if (
    bytes.length < 45 ||
    !signature.every((value, index) => bytes[index] === value)
  ) {
    return null;
  }

  const view = dataView(bytes);
  let animated = false;
  let hasImageData = false;
  let height = 0;
  let offset = 8;
  let width = 0;

  while (offset + 12 <= bytes.length) {
    const chunkLength = view.getUint32(offset, false);
    const chunkType = ascii(bytes, offset + 4, 4);
    const nextOffset = offset + 12 + chunkLength;

    if (nextOffset > bytes.length) {
      return null;
    }

    if (offset === 8 && (chunkType !== "IHDR" || chunkLength !== 13)) {
      return null;
    }

    if (chunkType === "IHDR") {
      width = view.getUint32(offset + 8, false);
      height = view.getUint32(offset + 12, false);
    } else if (chunkType === "IDAT") {
      hasImageData = true;
    } else if (chunkType === "acTL") {
      animated = true;
    } else if (chunkType === "IEND") {
      return chunkLength === 0 && hasImageData && validDimensions(width, height)
        ? { animated, height, mimeType: "image/png", width }
        : null;
    }

    offset = nextOffset;
  }

  return null;
}

function detectJpeg(bytes: Uint8Array): DetectedStaticImage | null {
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes.at(-2) !== 0xff ||
    bytes.at(-1) !== 0xd9
  ) {
    return null;
  }

  const view = dataView(bytes);
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;

  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (bytes[offset] === 0xff) {
      offset += 1;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 1 >= bytes.length) {
      return null;
    }

    const length = view.getUint16(offset, false);

    if (length < 2 || offset + length > bytes.length) {
      return null;
    }

    if (startOfFrameMarkers.has(marker) && length >= 7) {
      const height = view.getUint16(offset + 3, false);
      const width = view.getUint16(offset + 5, false);

      return validDimensions(width, height)
        ? { animated: false, height, mimeType: "image/jpeg", width }
        : null;
    }

    offset += length;
  }

  return null;
}

function detectWebp(bytes: Uint8Array): DetectedStaticImage | null {
  if (
    bytes.length < 30 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 4) !== "WEBP"
  ) {
    return null;
  }

  let offset = 12;
  let animationChunkFound = false;

  while (offset + 8 <= bytes.length) {
    const chunkType = ascii(bytes, offset, 4);
    const chunkSize = readUint32LittleEndian(bytes, offset + 4);
    const dataOffset = offset + 8;

    if (dataOffset + chunkSize > bytes.length) {
      return null;
    }

    if (chunkType === "ANIM" || chunkType === "ANMF") {
      animationChunkFound = true;
    }

    if (chunkType === "VP8X" && chunkSize >= 10) {
      const animated = Boolean(bytes[dataOffset] & 0x02) || animationChunkFound;
      const width = 1 + readUint24LittleEndian(bytes, dataOffset + 4);
      const height = 1 + readUint24LittleEndian(bytes, dataOffset + 7);

      return validDimensions(width, height)
        ? { animated, height, mimeType: "image/webp", width }
        : null;
    }

    if (
      chunkType === "VP8 " &&
      chunkSize >= 10 &&
      bytes[dataOffset + 3] === 0x9d &&
      bytes[dataOffset + 4] === 0x01 &&
      bytes[dataOffset + 5] === 0x2a
    ) {
      const width =
        (bytes[dataOffset + 6] | (bytes[dataOffset + 7] << 8)) & 0x3fff;
      const height =
        (bytes[dataOffset + 8] | (bytes[dataOffset + 9] << 8)) & 0x3fff;

      return validDimensions(width, height)
        ? {
            animated: animationChunkFound,
            height,
            mimeType: "image/webp",
            width,
          }
        : null;
    }

    if (
      chunkType === "VP8L" &&
      chunkSize >= 5 &&
      bytes[dataOffset] === 0x2f
    ) {
      const dimensions = readUint32LittleEndian(bytes, dataOffset + 1);
      const width = 1 + (dimensions & 0x3fff);
      const height = 1 + ((dimensions >> 14) & 0x3fff);

      return validDimensions(width, height)
        ? {
            animated: animationChunkFound,
            height,
            mimeType: "image/webp",
            width,
          }
        : null;
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function dataView(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number) {
  return dataView(bytes).getUint32(offset, true);
}

function validDimensions(width: number, height: number) {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
