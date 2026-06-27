"use server";

import { redirect } from "next/navigation";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await timeServer("logout.action.auth-sign-out", () => supabase.auth.signOut());
  redirect("/login");
}
