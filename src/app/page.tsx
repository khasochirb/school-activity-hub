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
  const platformPoints = [
    {
      title: t("landing.verifiedStudentsOnly"),
      body: t("landing.verifiedStudentsOnlyBody"),
    },
    {
      title: t("landing.clubsAndEvents"),
      body: t("landing.clubsAndEventsBody"),
    },
    {
      title: t("landing.teacherOversight"),
      body: t("landing.teacherOversightBody"),
    },
  ];
  const demoWorkflow = [
    t("workflow.addStudents"),
    t("workflow.generateInviteCodes"),
    t("workflow.studentsJoin"),
    t("workflow.createClubsEvents"),
    t("workflow.trackAttendance"),
  ];

  return (
    <main className="app-surface text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            className="flex cursor-pointer items-center gap-3 transition hover:text-teal-800"
            href="/"
          >
            <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold">
              {t("app.shortName")}
            </span>
            <span className="font-bold tracking-tight">{t("app.name")}</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2">
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

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-12">
        <div className="flex flex-col justify-center">
          <p className="page-eyebrow">{t("landing.platformEyebrow")}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
            {t("landing.headline")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            {t("landing.intro")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Link className="btn btn-primary" href="/dashboard">
                {t("landing.goToDashboard")}
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary" href="/login">
                  {t("landing.signIn")}
                </Link>
                <Link className="btn btn-secondary" href="/join">
                  {t("landing.joinWithInviteCode")}
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="section-card section-card-padded">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {t("landing.schoolPilotSnapshot")}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-950">
                  {t("landing.activityWeekOverview")}
                </p>
              </div>
              <span className="badge badge-success">
                {t("landing.verifiedAccess")}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniStat label={t("landing.students")} value={t("landing.rostered")} />
              <MiniStat label={t("landing.events")} value={t("common.approved")} />
              <MiniStat label={t("landing.checkIn")} value={t("landing.qrReady")} />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <ActivityRow
              label={t("landing.activityLabelInvites")}
              value={t("landing.activityRowInvites")}
            />
            <ActivityRow
              label={t("landing.activityLabelClubs")}
              value={t("landing.activityRowClubs")}
            />
            <ActivityRow
              label={t("landing.activityLabelAttendance")}
              value={t("landing.activityRowAttendance")}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-7 sm:px-6 md:grid-cols-3 lg:px-8">
          {platformPoints.map((point) => (
            <article className="section-card section-card-padded" key={point.title}>
              <h2 className="section-title">{point.title}</h2>
              <p className="section-description">{point.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="page-header">
          <p className="page-eyebrow">{t("landing.demoWorkflow")}</p>
          <h2 className="page-title">{t("landing.workflowTitle")}</h2>
          <p className="page-description">
            {t("landing.workflowDescription")}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {demoWorkflow.map((step, index) => (
              <article className="detail-card" key={step}>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  {tf("dashboard.nextSteps.stepLabel", { number: index + 1 })}
                </p>
                <p className="mt-2 text-sm font-bold text-slate-950">{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ActivityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm">
      <span className="font-semibold text-slate-900">{label}</span>
      <span className="text-right text-slate-500">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}
