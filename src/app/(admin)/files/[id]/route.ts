import { getAttachmentAccess } from "@/lib/attachments/attachment-access";
import { ATTACHMENT_BUCKET, isAttachmentOwnerType } from "@/lib/attachments/attachments";
import { isUuid } from "@/lib/clubs/club-profile";
import { logServerError } from "@/lib/errors/server-error";
import { createAdminClient } from "@/lib/supabase/admin";

type AttachmentFile = {
  content_type: string;
  file_name: string;
  owner_id: string;
  owner_type: string;
  school_id: string;
  storage_path: string;
};

// Downloads one attached file, for people who may see the club, event or
// announcement it belongs to. Always a download, never shown in the page.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!isUuid(id)) return notFound();

  const admin = createAdminClient();
  const { data: file } = await admin
    .from("attachments")
    .select("owner_type, owner_id, school_id, storage_path, file_name, content_type")
    .eq("id", id)
    .maybeSingle<AttachmentFile>();

  if (!file || !isAttachmentOwnerType(file.owner_type)) return notFound();

  const access = await getAttachmentAccess(file.owner_type, file.owner_id);

  if (!access?.canView || access.schoolId !== file.school_id) return notFound();

  const { data, error } = await admin.storage.from(ATTACHMENT_BUCKET).download(file.storage_path);

  if (error || !data) {
    logServerError("Attachment download failed", error);
    return notFound();
  }

  const asciiName = file.file_name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");

  return new Response(await data.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": file.content_type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFound() {
  return new Response("Not found", { headers: { "Cache-Control": "private, no-store" }, status: 404 });
}
