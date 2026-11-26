import { logServerError } from "@/lib/errors/server-error";
import {
  PORTFOLIO_MAX_PHOTOS,
  PORTFOLIO_MEDIA_BUCKET,
  isControlledPortfolioMediaPath,
  isUuidValue,
  portfolioPhotoContentType,
} from "@/lib/portfolio/portfolio";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type EntryMedia = {
  id: string;
  media_paths: string[];
  school_id: string;
  student_roster_id: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ entryId: string; index: string }> },
) {
  const { entryId, index } = await context.params;
  const position = Number(index);

  if (
    !isUuidValue(entryId) ||
    !Number.isInteger(position) ||
    position < 0 ||
    position >= PORTFOLIO_MAX_PHOTOS
  ) {
    return notFound();
  }

  // Row-level security only returns the entry if this user may see it.
  const supabase = await createClient();
  const { data: entry, error } = await supabase
    .from("portfolio_entries")
    .select("id, school_id, student_roster_id, media_paths")
    .eq("id", entryId)
    .maybeSingle<EntryMedia>();

  if (error) {
    logServerError("Portfolio photo lookup failed", error);
    return notFound();
  }

  const path = entry?.media_paths?.[position];

  if (
    !entry ||
    !path ||
    !isControlledPortfolioMediaPath(
      path,
      entry.school_id,
      entry.student_roster_id,
      entry.id,
    )
  ) {
    return notFound();
  }

  const admin = createAdminClient();
  const { data: image, error: downloadError } = await admin.storage
    .from(PORTFOLIO_MEDIA_BUCKET)
    .download(path);

  if (downloadError || !image) {
    logServerError("Portfolio photo download failed", downloadError);
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
    status: 200,
  });
}

function notFound() {
  return new Response(null, {
    headers: { "Cache-Control": "private, no-store" },
    status: 404,
  });
}
