"use server";

import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { hasAnySchool } from "@/lib/supabase/bootstrap";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SetupState = {
  message: string;
};

export async function createFirstSchool(
  _state: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const i18n = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: i18n.t("setup.errors.loginRequired") };
  }

  if (await hasAnySchool()) {
    redirect("/dashboard");
  }

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const timezone =
    String(formData.get("timezone") ?? "").trim() || "America/Vancouver";

  if (!name) {
    return { message: i18n.t("setup.errors.nameRequired") };
  }

  const slug = toSlug(slugInput || name);

  if (slug.length < 3) {
    return { message: i18n.t("setup.errors.slugMinLength") };
  }

  const admin = createAdminClient();
  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({
      name,
      slug,
      timezone,
      status: "active",
    })
    .select("id")
    .single();

  if (schoolError || !school) {
    return {
      message: i18n.t("setup.errors.createFailed"),
    };
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      school_id: school.id,
      role: "school_admin",
      status: "active",
      username: usernameFromEmail(user.email),
      full_name: fullNameForUser(user),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await admin.from("schools").delete().eq("id", school.id);

    return {
      message: i18n.tf("setup.errors.adminProfileSaveFailed", {
        error: profileError.message,
      }),
    };
  }

  redirect("/dashboard");
}

async function getServerI18n() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);

  return {
    t: (key: string) => translate(dictionary, key),
    tf: (key: string, values: Record<string, string | number>) =>
      formatTranslation(dictionary, key, values),
  };
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function usernameFromEmail(email: string | undefined) {
  const username = email
    ?.split("@")[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "_")
    .replace(/^[^a-z0-9_]+/, "")
    .slice(0, 31);

  return username && username.length >= 2 ? username : null;
}

function fullNameForUser(user: { email?: string; user_metadata?: { full_name?: unknown } }) {
  const metadataName = user.user_metadata?.full_name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email ?? "School Admin";
}
