import "server-only";

import { redirect } from "next/navigation";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import type { SitePage } from "@/lib/site/page-tree";
import { createClient } from "@/lib/supabase/server";
import type { SitePageFormLabels } from "./site-page-form";

// Loads the signed-in staff member's school and all its pages, drafts included.
// Students and signed-out visitors are sent away.
export async function loadSiteEditor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, schools(name, slug)")
    .eq("id", user.id)
    .eq("status", "active")
    .in("role", ["school_admin", "teacher"])
    .maybeSingle<{ school_id: string; schools: { name: string; slug: string } | null }>();

  if (!profile) {
    redirect("/dashboard");
  }

  const { data: pages } = await supabase
    .from("school_pages")
    .select("id, parent_id, slug, title, body, position, status, cover_path")
    .eq("school_id", profile.school_id)
    .order("position", { ascending: true })
    .returns<SitePage[]>();
  const dictionary = getDictionary(await getCurrentLocale());
  const t = (key: string) => translate(dictionary, key);
  const formLabels: SitePageFormLabels = {
    body: t("announcements.form.body"),
    bodyHint: t("site.form.bodyHint"),
    parent: t("site.form.parent"),
    publish: t("site.form.publish"),
    save: t("common.save"),
    saving: t("common.saving"),
    title: t("announcements.form.title"),
    topLevel: t("site.form.topLevel"),
  };

  return { formLabels, pages: pages ?? [], school: profile.schools, t };
}
