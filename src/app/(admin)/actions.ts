"use server";

import { redirect } from "next/navigation";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  // "local" ends the session on this device only. The library default ends
  // every session of the account, which signs out a student's other devices and
  // everyone sharing a demo account.
  await timeServer("logout.action.auth-sign-out", () =>
    supabase.auth.signOut({ scope: "local" }),
  );
  redirect("/login");
}
