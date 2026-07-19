import "server-only";

import { logServerError } from "@/lib/errors/server-error";
import { createAdminClient } from "./admin";

export async function hasAnySchool() {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("schools")
    .select("id", { count: "exact", head: true });

  if (error) {
    logServerError("School setup check failed", error);
    throw new Error("Unable to check school setup.");
  }

  return (count ?? 0) > 0;
}
