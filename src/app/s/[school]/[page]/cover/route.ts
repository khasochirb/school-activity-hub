import { logServerError } from "@/lib/errors/server-error";
import { getPublicSite } from "@/lib/site/school-site";
import { SITE_COVER_BUCKET, getSiteCoverMimeType, isControlledSiteCoverPath } from "@/lib/site/site-cover";
import { createAdminClient } from "@/lib/supabase/admin";

// Public: the cover photo of a PUBLISHED page of an ACTIVE school. Anything
// else, including a draft page's photo, answers 404.
export async function GET(
  _request: Request,
  context: { params: Promise<{ page: string; school: string }> },
) {
  const { page: pageSlug, school } = await context.params;
  const site = await getPublicSite(school);
  const page = site?.pages.find((candidate) => candidate.slug === pageSlug);
  const path = page?.cover_path;

  if (!site || !page || !path || !isControlledSiteCoverPath(path, site.school.id, page.id)) {
    return notFound();
  }

  const mimeType = getSiteCoverMimeType(path);
  const bucket = createAdminClient().storage.from(SITE_COVER_BUCKET);
  let { data: image, error } = await bucket.download(path, {
    transform: { format: "origin", height: 900, quality: 80, resize: "cover", width: 1600 },
  });

  // Image transformations are a paid Supabase feature; fall back to the original.
  if (error || !image) {
    ({ data: image, error } = await bucket.download(path));
  }

  if (error || !image || !mimeType) {
    logServerError("Site cover download failed", error, { pageId: page.id });
    return notFound();
  }

  return new Response(await image.arrayBuffer(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": mimeType,
      "X-Content-Type-Options": "nosniff",
    },
    status: 200,
  });
}

function notFound() {
  return new Response(null, { headers: { "Cache-Control": "no-store" }, status: 404 });
}
