import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentTheme } from "@/lib/get-theme";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const previewItems = [
    {
      title: t("landing.previewVerifiedStudentAccess"),
      body: t("landing.previewVerifiedStudentAccessBody"),
    },
    {
      title: t("landing.previewClubEventManagement"),
      body: t("landing.previewClubEventManagementBody"),
    },
    {
      title: t("landing.previewTeacherApproval"),
      body: t("landing.previewTeacherApprovalBody"),
    },
    {
      title: t("landing.previewQrAttendance"),
      body: t("landing.previewQrAttendanceBody"),
    },
    {
      title: t("landing.previewReports"),
      body: t("landing.previewReportsBody"),
    },
  ];

  const audienceCards = [
    {
      title: t("landing.audienceAdmins"),
      body: t("landing.audienceAdminsBody"),
    },
    {
      title: t("landing.audienceTeachers"),
      body: t("landing.audienceTeachersBody"),
    },
    {
      title: t("landing.audienceStudents"),
      body: t("landing.audienceStudentsBody"),
    },
  ];

  const workflowSteps = [
    t("workflow.addStudents"),
    t("workflow.generateInviteCodes"),
    t("workflow.studentsJoin"),
    t("workflow.createClubsEvents"),
    t("workflow.trackAttendance"),
  ];

  const trustItems = [
    t("landing.trustInviteOnly"),
    t("landing.trustSchoolRosters"),
    t("landing.trustStaffApproval"),
    t("landing.trustQrAttendance"),
    t("landing.trustBilingual"),
  ];

  return (
    <main className="app-surface text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            className="flex min-w-0 cursor-pointer items-center gap-3 transition hover:text-teal-800"
            href="/"
          >
            <span className="brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold">
              {t("app.shortName")}
            </span>
            <span className="min-w-0 break-words font-bold leading-tight tracking-tight">
              {t("app.name")}
            </span>
          </Link>
          <nav className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <LanguageSwitcher
              currentLocale={locale}
              label={t("language.label")}
              labels={{
                en: t("language.en"),
                mn: t("language.mn"),
              }}
            />
            <ThemeToggle
              currentTheme={theme}
              label={t("theme.label")}
              labels={{
                dark: t("theme.dark"),
                light: t("theme.light"),
                system: t("theme.system"),
              }}
              showLabel={false}
              switchLabel={t("theme.switch")}
            />
            {user ? (
              <Link className="btn btn-primary" href="/dashboard">
                {t("landing.goToDashboard")}
              </Link>
            ) : (
              <>
                <Link className="btn btn-secondary" href="/login">
                  {t("landing.signIn")}
                </Link>
                <Link className="btn btn-primary hidden sm:inline-flex" href="/join">
                  {t("landing.joinWithInviteCode")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1.03fr)_minmax(20rem,0.97fr)] lg:px-8 lg:py-14">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="page-eyebrow">{t("landing.platformEyebrow")}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            {t("landing.headline")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            {t("landing.intro")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Link className="btn btn-primary" href="/dashboard">
                {t("landing.goToDashboard")}
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary" href="/login">
                  {t("landing.staffSignIn")}
                </Link>
                <Link className="btn btn-secondary" href="/join">
                  {t("landing.studentJoinWithInvite")}
                </Link>
              </>
            )}
          </div>
          {!user ? (
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              {t("landing.studentInviteHelper")}
            </p>
          ) : null}
        </div>

        <aside className="section-card section-card-padded overflow-hidden">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F2AF68]" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              </div>
              <span className="badge badge-success max-w-full whitespace-normal leading-snug">
                {t("landing.verifiedAccess")}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-500">
                {t("landing.whatThisAppDoes")}
              </p>
              <p className="mt-1 text-xl font-bold leading-tight text-slate-950">
                {t("app.name")}
              </p>
            </div>
            <div className="mt-4 grid gap-2">
              {previewItems.map((item, index) => (
                <PreviewItem
                  body={item.body}
                  index={index + 1}
                  key={item.title}
                  title={item.title}
                />
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="page-eyebrow">{t("landing.audienceEyebrow")}</p>
            <h2 className="page-title">{t("landing.whoIsThisFor")}</h2>
            <p className="page-description">{t("landing.audienceDescription")}</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {audienceCards.map((card) => (
              <AudienceCard body={card.body} key={card.title} title={card.title} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="section-card section-card-padded">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="page-eyebrow">{t("landing.pilotWorkflow")}</p>
              <h2 className="page-title">{t("landing.workflowTitle")}</h2>
              <p className="page-description">{t("landing.workflowDescription")}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            {workflowSteps.map((step, index) => (
              <WorkflowStep
                isLast={index === workflowSteps.length - 1}
                key={step}
                label={tf("dashboard.nextSteps.stepLabel", { number: index + 1 })}
                title={step}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="page-eyebrow">{t("landing.trustEyebrow")}</p>
            <h2 className="page-title">{t("landing.privateByDesign")}</h2>
            <p className="page-description">{t("landing.privateByDesignBody")}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {trustItems.map((item) => (
              <TrustCard key={item} label={item} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function AudienceCard({ body, title }: { body: string; title: string }) {
  return (
    <article className="section-card section-card-padded">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-teal-200 bg-teal-50 text-sm font-black text-teal-800">
        SA
      </div>
      <h3 className="section-title">{title}</h3>
      <p className="section-description">{body}</p>
    </article>
  );
}

function PreviewItem({
  body,
  index,
  title,
}: {
  body: string;
  index: number;
  title: string;
}) {
  return (
    <article className="flex gap-3 rounded-md border border-slate-200 bg-white p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F2AF68] text-xs font-black text-[#2f2112]">
        {String(index).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold leading-snug text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
      </div>
    </article>
  );
}

function TrustCard({ label }: { label: string }) {
  return (
    <article className="flex min-w-0 items-start gap-3 rounded-md border border-slate-200 bg-white p-3">
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#F2AF68]" />
      <p className="min-w-0 break-words text-sm font-bold leading-6 text-slate-900">
        {label}
      </p>
    </article>
  );
}

function WorkflowStep({
  isLast,
  label,
  title,
}: {
  isLast: boolean;
  label: string;
  title: string;
}) {
  return (
    <article className="section-card section-card-padded relative min-h-28">
      {!isLast ? (
        <span className="absolute left-[calc(100%+0.1rem)] top-1/2 hidden h-px w-3 -translate-y-1/2 bg-[#F2AF68]/70 lg:block" />
      ) : null}
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
        {label}
      </p>
      <p className="mt-3 text-base font-bold leading-snug text-slate-950">{title}</p>
    </article>
  );
}
