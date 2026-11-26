"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export type SwitchSchoolState = { message: string };

// A platform admin moves their account to another school. The database
// function checks they are a platform admin and logs the switch.
export async function switchSchool(
  _state: SwitchSchoolState,
  formData: FormData,
): Promise<SwitchSchoolState> {
  const schoolId = String(formData.get("school_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_admin_switch_school", { target_school_id: schoolId });

  if (error) {
    logServerError("Platform admin school switch failed", error, { schoolId });
    const dictionary = getDictionary(await getCurrentLocale());

    return {
      message: translate(
        dictionary,
        error.code === "23503"
          ? "superAdmin.sites.console.switchBlocked"
          : "superAdmin.sites.console.switchFailed",
      ),
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
