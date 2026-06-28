import { redirect } from "next/navigation";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { hasAnySchool } from "@/lib/supabase/bootstrap";
import { createClient } from "@/lib/supabase/server";
import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (await hasAnySchool()) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">
          {t("setup.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {t("setup.description")}
        </p>
        <SetupForm
          labels={{
            createSchool: t("setup.actions.createSchool"),
            creating: t("setup.actions.creating"),
            schoolName: t("setup.form.schoolName"),
            schoolSlug: t("setup.form.schoolSlug"),
            slugPlaceholder: t("setup.form.slugPlaceholder"),
            timezone: t("setup.form.timezone"),
            timezoneDefault: t("setup.form.timezoneDefault"),
          }}
        />
      </div>
    </main>
  );
}
