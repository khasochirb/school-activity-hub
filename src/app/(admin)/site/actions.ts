"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

type StaffProfile = { id: string; school_id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Staff write their school's public pages. Row-level security repeats every
// check here: only staff of the school can read or write school_pages.
async function requireStaff(): Promise<{ profile: StaffProfile; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role, status")
    .eq("id", user.id)
    .eq("status", "active")
    .in("role", ["school_admin", "teacher"])
    .maybeSingle<StaffProfile>();

  if (!profile) {
    redirect("/dashboard");
  }

  return { profile, supabase };
}

function readPage(formData: FormData) {
  const parent = String(formData.get("parent_id") ?? "").trim();

  return {
    body: String(formData.get("body") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 20000),
    parent_id: UUID.test(parent) ? parent : null,
    status: formData.get("published") === "on" ? "published" : "draft",
    title: String(formData.get("title") ?? "").trim().slice(0, 120),
  };
}

export async function createSitePage(formData: FormData) {
  const { profile, supabase } = await requireStaff();
  const values = readPage(formData);

  if (!values.title) {
    redirect("/site?error=title");
  }

  const { data: existing } = await supabase
    .from("school_pages")
    .select("slug, position")
    .eq("school_id", profile.school_id)
    .returns<Array<{ position: number; slug: string }>>();
  // "visit" is the site's own visit-counter route, so no page may take it.
  const taken = new Set([...(existing ?? []).map((page) => page.slug), "visit"]);
  const base = toSlug(values.title).slice(0, 56).replace(/-+$/g, "") || "page";
  let slug = base.length >= 2 ? base : `${base}-page`;

  for (let suffix = 2; taken.has(slug); suffix += 1) {
    slug = `${base}-${suffix}`;
  }

  const { error } = await supabase.from("school_pages").insert({
    ...values,
    created_by_profile_id: profile.id,
    position: Math.max(0, ...(existing ?? []).map((page) => page.position)) + 1,
    school_id: profile.school_id,
    slug,
  });

  if (error) {
    redirect("/site?error=save");
  }

  revalidatePath("/site");
  redirect("/site?saved=1");
}

export async function updateSitePage(formData: FormData) {
  const { profile, supabase } = await requireStaff();
  const pageId = String(formData.get("page_id") ?? "");
  const values = readPage(formData);

  if (!UUID.test(pageId)) {
    redirect("/site");
  }

  if (!values.title) {
    redirect(`/site/${pageId}?error=title`);
  }

  // A page cannot sit under itself.
  const parent_id = values.parent_id === pageId ? null : values.parent_id;
  const { error } = await supabase
    .from("school_pages")
    .update({ ...values, parent_id, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .eq("school_id", profile.school_id);

  if (error) {
    redirect(`/site/${pageId}?error=save`);
  }

  revalidatePath("/site");
  redirect("/site?saved=1");
}

export async function deleteSitePage(formData: FormData) {
  const { profile, supabase } = await requireStaff();
  const pageId = String(formData.get("page_id") ?? "");

  if (UUID.test(pageId)) {
    await supabase.from("school_pages").delete().eq("id", pageId).eq("school_id", profile.school_id);
  }

  revalidatePath("/site");
  redirect("/site");
}
