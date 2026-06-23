import { createAdminClient } from "./admin";

export async function hasAnySchool() {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("schools")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`Unable to check school setup: ${error.message}`);
  }

  return (count ?? 0) > 0;
}
