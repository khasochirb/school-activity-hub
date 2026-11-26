import "server-only";

import { logServerError } from "@/lib/errors/server-error";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type StudentInterestsResult = {
  interests: string[];
  // False until the student_interests migration has been applied.
  available: boolean;
};

export async function loadStudentInterests(
  supabase: SupabaseServerClient,
  profileId: string,
): Promise<StudentInterestsResult> {
  const { data, error } = await supabase
    .from("student_interests")
    .select("category, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true })
    .returns<Array<{ category: string; created_at: string }>>();

  if (error) {
    if (!isMissingTableError(error.code)) {
      logServerError("Student interests lookup failed", error);
    }

    return { available: !isMissingTableError(error.code), interests: [] };
  }

  return {
    available: true,
    interests: (data ?? []).map((row) => row.category),
  };
}

export function isMissingTableError(code: string | undefined) {
  return code === "PGRST205" || code === "42P01";
}
