import { logServerError } from "@/lib/errors/server-error";
import { getPublicSite } from "@/lib/site/school-site";
import { isCountableVisit, visitDay } from "@/lib/site/site-visits";
import { createAdminClient } from "@/lib/supabase/admin";

// Public: adds one to today's count for a page of the school's site. Stores
// nothing about the visitor. Answers 204 either way, so it reveals nothing.
export async function POST(request: Request, context: { params: Promise<{ school: string }> }) {
  const done = new Response(null, { headers: { "Cache-Control": "no-store" }, status: 204 });

  if (!isCountableVisit(request.headers.get("user-agent"), request.headers.get("sec-purpose") ?? request.headers.get("purpose"))) {
    return done;
  }

  const { school } = await context.params;
  const pageSlug = new URL(request.url).searchParams.get("page") ?? "";
  const site = await getPublicSite(school);

  if (!site) return done;

  const page = pageSlug ? site.pages.find((candidate) => candidate.slug === pageSlug) : null;

  if (pageSlug && !page) return done;

  const { error } = await createAdminClient().rpc("record_school_site_view", {
    target_page_key: page?.id ?? "",
    target_school_id: site.school.id,
    view_day: visitDay(new Date(), site.school.timezone),
  });

  if (error) logServerError("School site visit count failed", error, { school: site.school.slug });

  return done;
}
