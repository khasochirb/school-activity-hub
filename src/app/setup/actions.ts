"use server";

import { redirect } from "next/navigation";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "You must be logged in to create the first school." };
  }

  if (await hasAnySchool()) {
    redirect("/dashboard");
  }

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const timezone =
    String(formData.get("timezone") ?? "").trim() || "America/Vancouver";

  if (!name) {
    return { message: "School name is required." };
  }

  const slug = toSlug(slugInput || name);

  if (slug.length < 3) {
    return { message: "School slug must be at least 3 characters." };
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
      message: schoolError?.message ?? "Unable to create the school.",
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
      message: `School was not created because the admin profile could not be saved: ${profileError.message}`,
    };
  }

  redirect("/dashboard");
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
