"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseActivityCategory } from "@/lib/activity-categories";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { timeServer } from "@/lib/server-timing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type StudentRoster = {
  id: string;
};

export type CreateClubState = {
  message: string;
  success: boolean;
};

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

export async function createClub(
  _state: CreateClubState,
  formData: FormData,
): Promise<CreateClubState> {
  const i18n = await getServerI18n();
  const profile = await getCurrentProfile();

  if (!profile || !isStaff(profile)) {
    return {
      message: i18n.t("clubs.errors.staffOnlyCreate"),
      success: false,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryInput = String(formData.get("category") ?? "").trim();
  const category = parseActivityCategory(categoryInput);
  const status = String(formData.get("status") ?? "active");

  if (!name) {
    return { message: i18n.t("clubs.errors.nameRequired"), success: false };
  }

  if (!["active", "archived"].includes(status)) {
    return { message: i18n.t("clubs.errors.invalidStatus"), success: false };
  }

  if (categoryInput && !category) {
    return { message: i18n.t("clubs.errors.invalidCategory"), success: false };
  }

  const slug = toSlug(name);

  if (slug.length < 3) {
    return {
      message: i18n.t("clubs.errors.nameTooShort"),
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await timeServer("clubs.action.create.insert", () =>
    supabase.from("clubs").insert({
      school_id: profile.school_id,
      created_by_profile_id: profile.id,
      name,
      slug,
      description: description || null,
      category: category || null,
      status,
    }),
  );

  if (error) {
    return {
      message:
        error.code === "23505"
          ? i18n.t("clubs.errors.duplicateName")
          : i18n.tf("clubs.errors.createFailed", {
              error: i18n.t("common.somethingWentWrong"),
            }),
      success: false,
    };
  }

  revalidatePath("/clubs");

  return { message: i18n.t("clubs.success.created"), success: true };
}

export async function archiveClub(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isStaff(profile)) {
    redirect("/clubs");
  }

  const clubId = String(formData.get("club_id") ?? "").trim();

  if (!clubId) {
    return;
  }

  const supabase = await createClient();
  await timeServer("clubs.action.archive.update", () =>
    supabase
      .from("clubs")
      .update({ status: "archived" })
      .eq("id", clubId)
      .eq("school_id", profile.school_id)
      .eq("status", "active"),
  );

  revalidatePath("/clubs");
  revalidatePath(`/clubs/${clubId}`);
}

export async function joinClub(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    redirect("/clubs");
  }

  const clubId = String(formData.get("club_id") ?? "").trim();

  if (!clubId) {
    return;
  }

  const admin = createAdminClient();
  const student = await getCurrentStudentRoster(admin, profile);

  if (!student) {
    return;
  }

  const { data: club } = await timeServer("clubs.action.join.club-lookup", () =>
    admin
      .from("clubs")
      .select("id")
      .eq("id", clubId)
      .eq("school_id", profile.school_id)
      .eq("status", "active")
      .maybeSingle<{ id: string }>(),
  );

  if (!club) {
    return;
  }

  const { data: existingMembership } = await timeServer(
    "clubs.action.join.existing-membership",
    () =>
      admin
        .from("club_memberships")
        .select("id")
        .eq("club_id", club.id)
        .eq("student_roster_id", student.id)
        .eq("school_id", profile.school_id)
        .maybeSingle<{ id: string }>(),
  );

  if (existingMembership) {
    await timeServer("clubs.action.join.reactivate-membership", () =>
      admin
        .from("club_memberships")
        .update({ role: "member", status: "active" })
        .eq("id", existingMembership.id)
        .eq("school_id", profile.school_id),
    );
  } else {
    await timeServer("clubs.action.join.insert-membership", () =>
      admin.from("club_memberships").insert({
        school_id: profile.school_id,
        club_id: club.id,
        student_roster_id: student.id,
        role: "member",
        status: "active",
        created_by_profile_id: profile.id,
      }),
    );
  }

  revalidatePath("/clubs");
  revalidatePath(`/clubs/${clubId}`);
}

export async function leaveClub(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "student") {
    redirect("/clubs");
  }

  const clubId = String(formData.get("club_id") ?? "").trim();

  if (!clubId) {
    return;
  }

  const admin = createAdminClient();
  const student = await getCurrentStudentRoster(admin, profile);

  if (!student) {
    return;
  }

  await timeServer("clubs.action.leave.update-membership", () =>
    admin
      .from("club_memberships")
      .update({ status: "inactive" })
      .eq("club_id", clubId)
      .eq("student_roster_id", student.id)
      .eq("school_id", profile.school_id)
      .eq("status", "active"),
  );

  revalidatePath("/clubs");
  revalidatePath(`/clubs/${clubId}`);
}

export async function assignClubLeader(formData: FormData) {
  const profile = await getCurrentProfile();

  if (!profile || !isStaff(profile)) {
    redirect("/clubs");
  }

  const membershipId = String(formData.get("membership_id") ?? "").trim();

  if (!membershipId) {
    return;
  }

  const supabase = await createClient();
  await timeServer("clubs.action.assign-leader.update", () =>
    supabase
      .from("club_memberships")
      .update({ role: "leader" })
      .eq("id", membershipId)
      .eq("school_id", profile.school_id)
      .eq("status", "active"),
  );

  revalidatePath("/clubs");
}

async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("clubs.action.current-profile.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer(
    "clubs.action.current-profile.profile",
    () =>
      supabase
        .from("profiles")
        .select("id, school_id, role")
        .eq("id", user.id)
        .maybeSingle<Profile>(),
  );

  return profile;
}

async function getServerI18n(): Promise<ServerI18n> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  return { t, tf };
}

async function getCurrentStudentRoster(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile,
): Promise<StudentRoster | null> {
  const { data: student } = await timeServer(
    "clubs.action.current-student",
    () =>
      admin
        .from("student_rosters")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .maybeSingle<StudentRoster>(),
  );

  return student;
}

function isStaff(profile: Profile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
