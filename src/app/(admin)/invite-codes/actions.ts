"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";

type ServerI18n = {
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
};

type StaffProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

export type GenerateInviteState = {
  code: string | null;
  message: string;
  success: boolean;
};

type BulkInviteStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  homeroom: string | null;
  student_number: string | null;
};

type GeneratedBulkInviteCode = {
  class_group: string;
  expires_at: string;
  grade: string;
  invite_code: string;
  student_name: string;
  student_number: string;
};

export type BulkGenerateInviteState = {
  codes: GeneratedBulkInviteCode[];
  csv: string;
  message: string;
  success: boolean;
  text: string;
};

export async function generateInviteCode(
  _state: GenerateInviteState,
  formData: FormData,
): Promise<GenerateInviteState> {
  const { t, tf } = await getServerI18n();
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return {
      code: null,
      message: t("invites.errors.staffOnly"),
      success: false,
    };
  }

  const studentId = String(formData.get("student_roster_id") ?? "").trim();

  if (!studentId) {
    return {
      code: null,
      message: t("invites.errors.studentRequired"),
      success: false,
    };
  }

  const supabase = await createClient();
  const { data: student } = await timeServer(
    "invite-codes.action.generate.student-lookup",
    () =>
      supabase
        .from("student_rosters")
        .select("id")
        .eq("id", studentId)
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .maybeSingle<{ id: string }>(),
  );

  if (!student) {
    return {
      code: null,
      message: t("invites.errors.studentInactiveOrWrongSchool"),
      success: false,
    };
  }

  const { data: existingInvite } = await timeServer(
    "invite-codes.action.generate.existing-active-invite",
    () =>
      supabase
        .from("invite_codes")
        .select("id")
        .eq("student_roster_id", student.id)
        .eq("school_id", profile.school_id)
        .eq("status", "active")
        .eq("use_count", 0)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle<{ id: string }>(),
  );

  if (existingInvite) {
    return {
      code: null,
      message: t("invites.errors.studentAlreadyHasActiveCode"),
      success: false,
    };
  }

  const plainCode = createPlainInviteCode();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const { error } = await timeServer(
    "invite-codes.action.generate.insert",
    () =>
      supabase.from("invite_codes").insert({
        school_id: profile.school_id,
        student_roster_id: student.id,
        created_by_profile_id: profile.id,
        code_hash: hashInviteCode(plainCode),
        code_hint: `${plainCode.slice(0, 4)}...`,
        status: "active",
        max_uses: 1,
        use_count: 0,
        expires_at: expiresAt.toISOString(),
      }),
  );

  if (error) {
    return {
      code: null,
      message: tf("invites.errors.createFailed", { error: error.message }),
      success: false,
    };
  }

  revalidatePath("/invite-codes");

  return {
    code: plainCode,
    message: t("invites.success.created"),
    success: true,
  };
}

export async function bulkGenerateInviteCodes(
  _state: BulkGenerateInviteState,
  formData: FormData,
): Promise<BulkGenerateInviteState> {
  const { t, tf } = await getServerI18n();
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    return createBulkState({
      message: t("invites.errors.staffOnly"),
      success: false,
    });
  }

  const mode = parseBulkMode(String(formData.get("bulk_mode") ?? ""));
  const selectedIds = formData
    .getAll("student_roster_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const grade = String(formData.get("grade") ?? "").trim();
  const classGroup = String(formData.get("class_group") ?? "").trim();
  const eligibleStudents = await getEligibleBulkStudents(profile.school_id);
  let targetStudents = eligibleStudents;

  if (mode === "selected") {
    if (!selectedIds.length) {
      return createBulkState({
        message: t("invites.bulk.errors.chooseStudent"),
        success: false,
      });
    }

    const selectedIdSet = new Set(selectedIds);
    targetStudents = eligibleStudents.filter((student) =>
      selectedIdSet.has(student.id),
    );
  }

  if (mode === "filtered") {
    if (!grade && !classGroup) {
      return createBulkState({
        message: t("invites.bulk.errors.chooseFilter"),
        success: false,
      });
    }

    targetStudents = eligibleStudents.filter((student) => {
      const matchesGrade = !grade || student.grade_level === grade;
      const matchesClassGroup = !classGroup || student.homeroom === classGroup;

      return matchesGrade && matchesClassGroup;
    });
  }

  if (!targetStudents.length) {
    return createBulkState({
      message: t("invites.bulk.errors.noMatches"),
      success: false,
    });
  }

  const targetStudentIds = targetStudents.map((student) => student.id);
  const studentsWithActiveInvites = await getStudentsWithActiveInvites(
    profile.school_id,
    targetStudentIds,
  );
  const studentsNeedingInvites = targetStudents.filter(
    (student) => !studentsWithActiveInvites.has(student.id),
  );

  if (!studentsNeedingInvites.length) {
    return createBulkState({
      message: t("invites.bulk.errors.allAlreadyHaveCodes"),
      success: false,
    });
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const generatedCodes = studentsNeedingInvites.map((student) => ({
    code: createPlainInviteCode(),
    student,
  }));
  const supabase = await createClient();
  const { error } = await timeServer(
    "invite-codes.action.bulk-generate.insert",
    () =>
      supabase.from("invite_codes").insert(
        generatedCodes.map(({ code, student }) => ({
          school_id: profile.school_id,
          student_roster_id: student.id,
          created_by_profile_id: profile.id,
          code_hash: hashInviteCode(code),
          code_hint: `${code.slice(0, 4)}...`,
          status: "active",
          max_uses: 1,
          use_count: 0,
          expires_at: expiresAt.toISOString(),
        })),
      ),
  );

  if (error) {
    return createBulkState({
      message: tf("invites.errors.generateFailed", { error: error.message }),
      success: false,
    });
  }

  revalidatePath("/invite-codes");

  const codes = generatedCodes.map(({ code, student }) => ({
    class_group: student.homeroom ?? "",
    expires_at: expiresAt.toISOString(),
    grade: student.grade_level ?? "",
    invite_code: code,
    student_name: studentName(student),
    student_number: student.student_number ?? "",
  }));
  const skippedCount = targetStudents.length - studentsNeedingInvites.length;
  const skippedMessage =
    skippedCount > 0
      ? ` ${tf("invites.bulk.success.skippedExisting", {
          count: skippedCount,
        })}`
      : "";

  return createBulkState({
    codes,
    message: `${tf("invites.bulk.success.generated", {
      count: codes.length,
    })}${skippedMessage}`,
    success: true,
  });
}

export async function revokeInviteCode(formData: FormData) {
  const profile = await getCurrentStaffProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const inviteId = String(formData.get("invite_code_id") ?? "").trim();

  if (!inviteId) {
    return;
  }

  const supabase = await createClient();
  await timeServer("invite-codes.action.revoke.update", () =>
    supabase
      .from("invite_codes")
      .update({ status: "revoked" })
      .eq("id", inviteId)
      .eq("school_id", profile.school_id)
      .eq("status", "active")
      .eq("use_count", 0)
      .is("redeemed_at", null),
  );

  revalidatePath("/invite-codes");
}

async function getCurrentStaffProfile(): Promise<StaffProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("invite-codes.action.current-staff.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer(
    "invite-codes.action.current-staff.profile",
    () =>
      supabase
        .from("profiles")
        .select("id, school_id, role")
        .eq("id", user.id)
        .maybeSingle<StaffProfile>(),
  );

  if (!profile || !["school_admin", "teacher"].includes(profile.role)) {
    return null;
  }

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

async function getEligibleBulkStudents(schoolId: string) {
  const supabase = await createClient();
  const { data: students } = await timeServer(
    "invite-codes.action.bulk-generate.eligible-students",
    () =>
      supabase
        .from("student_rosters")
        .select(
          "id, first_name, last_name, grade_level, homeroom, student_number",
        )
        .eq("school_id", schoolId)
        .eq("status", "active")
        .is("profile_id", null)
        .order("last_name", { ascending: true })
        .returns<BulkInviteStudent[]>(),
  );

  return students ?? [];
}

async function getStudentsWithActiveInvites(
  schoolId: string,
  studentIds: string[],
) {
  if (!studentIds.length) {
    return new Set<string>();
  }

  const supabase = await createClient();
  const { data: inviteCodes } = await timeServer(
    "invite-codes.action.bulk-generate.existing-active-invites",
    () =>
      supabase
        .from("invite_codes")
        .select("student_roster_id")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .eq("use_count", 0)
        .is("redeemed_at", null)
        .gt("expires_at", new Date().toISOString())
        .in("student_roster_id", studentIds)
        .returns<Array<{ student_roster_id: string | null }>>(),
  );

  return new Set(
    (inviteCodes ?? [])
      .map((inviteCode) => inviteCode.student_roster_id)
      .filter((studentId): studentId is string => Boolean(studentId)),
  );
}

function createBulkState({
  codes = [],
  message,
  success,
}: {
  codes?: GeneratedBulkInviteCode[];
  message: string;
  success: boolean;
}): BulkGenerateInviteState {
  return {
    codes,
    csv: createInviteCodesCsv(codes),
    message,
    success,
    text: codes
      .map((code) => `${code.student_name}: ${code.invite_code}`)
      .join("\n"),
  };
}

function parseBulkMode(value: string) {
  if (value === "selected" || value === "filtered") {
    return value;
  }

  return "all_unlinked";
}

function studentName(student: BulkInviteStudent) {
  return `${student.first_name} ${student.last_name}`;
}

function createInviteCodesCsv(codes: GeneratedBulkInviteCode[]) {
  const headers = [
    "student_name",
    "grade",
    "class_group",
    "student_number",
    "invite_code",
    "expires_at",
  ];
  const rows = codes.map((code) =>
    [
      code.student_name,
      code.grade,
      code.class_group,
      code.student_number,
      code.invite_code,
      code.expires_at,
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function createPlainInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  const characters = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `${characters.slice(0, 4).join("")}-${characters.slice(4, 8).join("")}-${characters.slice(8).join("")}`;
}

function hashInviteCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}
