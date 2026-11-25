// Files (PDF and Word) attached to clubs, events and announcements: the
// rules shared by the uploader, the server actions and the download route.
// No imports, so the tests can run it directly.

export const ATTACHMENT_BUCKET = "attachments";
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_PER_OWNER = 10;
export const ATTACHMENT_NAME_MAX = 160;

export const ATTACHMENT_OWNER_TYPES = ["club", "event", "announcement"] as const;
export type AttachmentOwnerType = (typeof ATTACHMENT_OWNER_TYPES)[number];

export const ATTACHMENT_TYPES = {
  "application/msword": "doc",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

export type AttachmentMimeType = keyof typeof ATTACHMENT_TYPES;

// What the file picker offers.
export const ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAttachmentOwnerType(value: unknown): value is AttachmentOwnerType {
  return ATTACHMENT_OWNER_TYPES.some((type) => type === value);
}

export function isAttachmentMimeType(value: unknown): value is AttachmentMimeType {
  return typeof value === "string" && value in ATTACHMENT_TYPES;
}

// The type from the file's own bytes, never from its name or what the
// browser claims: PDF starts "%PDF-", .docx is a zip ("PK\x03\x04"), .doc is
// an OLE compound file.
export function sniffAttachmentType(bytes: Uint8Array): AttachmentMimeType | null {
  const starts = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);

  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (starts([0x50, 0x4b, 0x03, 0x04])) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "application/msword";

  return null;
}

// Guess the type from the name for the browser's upload, before the server
// checks the bytes.
export function attachmentTypeFromName(name: string): AttachmentMimeType | null {
  const extension = name.toLowerCase().split(".").pop();
  const entry = Object.entries(ATTACHMENT_TYPES).find(([, ext]) => ext === extension);

  return entry ? (entry[0] as AttachmentMimeType) : null;
}

// A name that is safe to show and to send back as a download name: no
// folders, no control characters, not too long, with the right extension.
export function cleanAttachmentName(raw: string, mimeType: AttachmentMimeType) {
  const extension = ATTACHMENT_TYPES[mimeType];
  const base = (raw.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.(pdf|docx?)$/i, "");
  const stem = (base || "file").slice(0, ATTACHMENT_NAME_MAX - extension.length - 1).trim() || "file";

  return `${stem}.${extension}`;
}

// <school>/<club|event|announcement>/<owner id>/<uuid>.<pdf|doc|docx>
export function buildAttachmentPath(
  schoolId: string,
  ownerType: AttachmentOwnerType,
  ownerId: string,
  fileId: string,
  mimeType: AttachmentMimeType,
) {
  return `${schoolId}/${ownerType}/${ownerId}/${fileId}.${ATTACHMENT_TYPES[mimeType]}`;
}

export function isControlledAttachmentPath(
  path: string,
  schoolId: string,
  ownerType: AttachmentOwnerType,
  ownerId: string,
) {
  const parts = path.split("/");
  const [fileId, extension] = (parts[3] ?? "").split(".");

  return (
    parts.length === 4 &&
    parts[0] === schoolId &&
    parts[1] === ownerType &&
    parts[2] === ownerId &&
    UUID.test(fileId ?? "") &&
    ["pdf", "doc", "docx"].includes(extension ?? "")
  );
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
