import { getParentViewer, isParentOf, PARENT_VISIBLE_PORTFOLIO } from "@/lib/family/family-data";
import { logServerError } from "@/lib/errors/server-error";
import {
  PORTFOLIO_MAX_PHOTOS,
  PORTFOLIO_MEDIA_BUCKET,
  isControlledPortfolioMediaPath,
  isUuidValue,
  portfolioPhotoContentType,
} from "@/lib/portfolio/portfolio";
import { createAdminClient } from "@/lib/supabase/admin";

type EntryMedia = {
  id: string;
  is_draft: boolean;
  media_paths: string[];
  school_id: string;
  student_roster_id: string;
  visibility: string;
};

// A photo from a child's portfolio, for that child's parent only, and only
// from an entry the parent may see (shared, not a draft).
export async function GET(
  _request: Request,
  context: { params: Promise<{ entryId: string; index: string }> },
) {
  const { entryId, index } = await context.params;
  const position = Number(index);

  if (!isUuidValue(entryId) || !Number.isInteger(position) || position < 0 || position >= PORTFOLIO_MAX_PHOTOS) {
    return notFound();
  }

  const parent = await getParentViewer();

  if (!parent) return notFound();

  const admin = createAdminClient();
  const { data: entry } = await admin
    .from("portfolio_entries")
    .select("id, school_id, student_roster_id, media_paths, visibility, is_draft")
    .eq("id", entryId)
    .maybeSingle<EntryMedia>();
  const path = entry?.media_paths?.[position];

  if (
    !entry ||
    !path ||
    entry.is_draft ||
    !(PARENT_VISIBLE_PORTFOLIO as readonly string[]).includes(entry.visibility) ||
    !(await isParentOf(parent.id, entry.student_roster_id)) ||
    !isControlledPortfolioMediaPath(path, entry.school_id, entry.student_roster_id, entry.id)
  ) {
    return notFound();
  }

  const { data: image, error } = await admin.storage.from(PORTFOLIO_MEDIA_BUCKET).download(path);

  if (error || !image) {
    logServerError("Family portfolio photo download failed", error);
    return notFound();
  }

  return new Response(await image.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": portfolioPhotoContentType(path),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFound() {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
}
