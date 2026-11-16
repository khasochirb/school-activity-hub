import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildPageTree, type SitePage } from "./page-tree";

export type PublicSchool = { id: string; name: string; slug: string; timezone: string };

export type PublicActivity = {
  category: string | null;
  ends_at: string;
  id: string;
  location: string | null;
  starts_at: string;
  title: string;
};

export type PublicClub = { category: string | null; description: string | null; id: string; name: string };

const PAGE_COLUMNS = "id, parent_id, slug, title, body, position, status, cover_path";

// Everything the public school site may show. Nothing here is behind a login,
// so each query is limited by hand: an ACTIVE school, PUBLISHED pages, APPROVED
// upcoming activities, ACTIVE clubs, and only the columns listed. No table with
// students in it (rosters, memberships, attendees, portfolios) is read.
export async function getPublicSchool(slug: string): Promise<PublicSchool | null> {
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
    return null;
  }

  const { data } = await createAdminClient()
    .from("schools")
    .select("id, name, slug, timezone")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle<PublicSchool>();

  return data ?? null;
}

export async function getPublishedPages(schoolId: string): Promise<SitePage[]> {
  const { data } = await createAdminClient()
    .from("school_pages")
    .select(PAGE_COLUMNS)
    .eq("school_id", schoolId)
    .eq("status", "published")
    .order("position", { ascending: true })
    .returns<SitePage[]>();

  return data ?? [];
}

export async function getPublicSite(slug: string) {
  const school = await getPublicSchool(slug);

  if (!school) {
    return null;
  }

  const pages = await getPublishedPages(school.id);

  return { pages, school, tree: buildPageTree(pages) };
}

export async function getPublicActivities(schoolId: string, limit = 6): Promise<PublicActivity[]> {
  const { data } = await createAdminClient()
    .from("events")
    .select("id, title, starts_at, ends_at, location, category")
    .eq("school_id", schoolId)
    .eq("status", "approved")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit)
    .returns<PublicActivity[]>();

  return data ?? [];
}

export async function getPublicClubs(schoolId: string): Promise<PublicClub[]> {
  const { data } = await createAdminClient()
    .from("clubs")
    .select("id, name, category, description")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .order("name", { ascending: true })
    .returns<PublicClub[]>();

  return data ?? [];
}
