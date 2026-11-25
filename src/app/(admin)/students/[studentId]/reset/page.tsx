import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { isUuid } from "@/lib/clubs/club-profile";
import { formatDateTime } from "@/lib/i18n/date-format";
import { formatTranslation, getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHead } from "../../../_components/clean-ui";
import { ResetSignInForm } from "./reset-form";

// "Reset sign-in" for one student: shows which login will be turned off, then
// gives a new one-time code. School admins only.
export default async function ResetStudentSignInPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) => formatTranslation(dictionary, key, values);
  const actor = await requireActiveSchoolProfile();

  if (actor.role !== "school_admin") redirect("/students");
  if (!isUuid(studentId)) notFound();

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("student_rosters")
    .select("id, first_name, last_name, homeroom, profile_id")
    .eq("id", studentId)
    .eq("school_id", actor.school_id)
    .maybeSingle<{ first_name: string; homeroom: string | null; id: string; last_name: string; profile_id: string | null }>();

  if (!student) notFound();

  // The login being turned off, so the admin can check it with the student
  // first (a mistyped email is the usual reason they can't get in).
  const { data: login } = student.profile_id
    ? await admin.auth.admin.getUserById(student.profile_id)
    : { data: { user: null } };
  const user = login?.user ?? null;

  return (
    <div className="cl-page">
      <Link className="cl-back" href="/students">
        ← {t("students.title")}
      </Link>
      <PageHead
        subtitle={[student.homeroom, `${student.first_name} ${student.last_name}`].filter(Boolean).join(" · ")}
        title={t("students.reset.title")}
      />
      <div className="cl-card flex flex-col gap-4 p-5">
        {user ? (
          <div className="notice-box">
            <p className="text-sm font-bold">{t("students.reset.currentLogin")}</p>
            <p className="mt-1 font-mono text-base">{user.email}</p>
            <p className="mt-1 text-sm">
              {user.last_sign_in_at
                ? tf("students.reset.lastSignIn", { date: formatDateTime(user.last_sign_in_at, locale) })
                : t("students.reset.neverSignedIn")}
            </p>
            <p className="mt-2 text-sm">{t("students.reset.checkFirst")}</p>
          </div>
        ) : (
          <p className="text-sm">{t("students.reset.noAccount")}</p>
        )}
        <ul className="list-disc pl-5 text-sm leading-6">
          {user ? <li>{t("students.reset.effectOff")}</li> : null}
          <li>{t("students.reset.effectKeep")}</li>
          <li>{t("students.reset.effectCode")}</li>
        </ul>
        <ResetSignInForm
          labels={{
            codeHint: t("students.reset.codeHint"),
            codeLabel: t("students.reset.codeLabel"),
            confirm: user ? t("students.reset.confirm") : t("students.reset.confirmNoAccount"),
            working: t("students.reset.working"),
          }}
          studentId={student.id}
        />
      </div>
    </div>
  );
}
