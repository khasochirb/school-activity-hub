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
    <main className="app-surface flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="section-card w-full max-w-md p-4 shadow-sm sm:p-5">
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
