import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { HomepageActivityFlow } from "@/components/homepage-activity-flow";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentTheme } from "@/lib/get-theme";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const features = [
    {
      body: t("landing.previewVerifiedStudentAccessBody"),
      title: t("landing.previewVerifiedStudentAccess"),
    },
    {
      body: t("landing.previewClubEventManagementBody"),
      title: t("landing.previewClubEventManagement"),
    },
    {
      body: t("landing.previewTeacherApprovalBody"),
      title: t("landing.previewTeacherApproval"),
    },
    {
      body: t("landing.previewQrAttendanceBody"),
      title: t("landing.previewQrAttendance"),
    },
    {
      body: t("landing.previewReportsBody"),
      title: t("landing.previewReports"),
    },
  ];

  const audiences = [
    {
      body: t("landing.audienceAdminsBody"),
      icon: "admin" as const,
      title: t("landing.audienceAdmins"),
      tone: "ink" as const,
    },
    {
      body: t("landing.audienceTeachersBody"),
      icon: "teacher" as const,
      title: t("landing.audienceTeachers"),
      tone: "primary" as const,
    },
    {
      body: t("landing.audienceStudentsBody"),
      icon: "student" as const,
      title: t("landing.audienceStudents"),
      tone: "sun" as const,
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

  const activityFlowItems = [
    { category: "Other", label: t("landing.activityStream.studentClubs") },
    { category: "Sports", label: t("categories.sports") },
    { category: "Arts", label: t("categories.arts") },
    { category: "Volunteering", label: t("categories.volunteering") },
    { category: "Academic", label: t("landing.activityStream.workshops") },
    { category: "Leadership", label: t("landing.activityStream.competitions") },
    {
      category: "Social",
      label: t("landing.activityStream.communityActivities"),
    },
  ];

  return (
    <main className="landing min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="landing-header sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="flex shrink-0 items-center gap-3" href="/">
            <BrandMark />
            <span className="whitespace-nowrap font-display text-[0.95rem] font-semibold">
              {t("app.name")}
            </span>
          </Link>
          <nav className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
            <LanguageSwitcher
              className="w-auto"
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
              <Link className="btn btn-secondary" href="/login">
                {t("landing.signIn")}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-8 lg:pb-24">
        <div className="min-w-0">
          <p className="page-eyebrow">{t("landing.platformEyebrow")}</p>
          <h1 className="landing-headline mt-5 font-display">
            {t("landing.headline")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            {t("landing.intro")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Link className="btn btn-primary btn-lg" href="/dashboard">
                {t("landing.goToDashboard")}
                <Arrow />
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary btn-lg" href="/join">
                  {t("landing.studentJoinWithInvite")}
                  <Arrow />
                </Link>
                <Link className="btn btn-secondary btn-lg" href="/login">
                  {t("landing.staffSignIn")}
                </Link>
              </>
            )}
          </div>
          {!user ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              {t("landing.studentInviteHelper")}
            </p>
          ) : null}
        </div>

        <PosterWall
          labels={{
            approved: t("landing.activityRowClubs"),
            arts: t("categories.arts"),
            attendance: t("landing.activityRowAttendance"),
            checkIn: t("landing.checkIn"),
            events: t("landing.events"),
            inviteRow: t("landing.activityRowInvites"),
            invites: t("landing.activityLabelInvites"),
            qrReady: t("landing.qrReady"),
            sports: t("categories.sports"),
            verified: t("landing.verifiedStudentsOnly"),
          }}
        />
      </section>

      <HomepageActivityFlow
        items={activityFlowItems}
        labels={{
          description: t("landing.activityStream.description"),
          eyebrow: t("landing.activityStream.eyebrow"),
          pause: t("landing.activityStream.pause"),
          resume: t("landing.activityStream.resume"),
          title: t("landing.activityStream.title"),
        }}
      />

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionIntro
          description={t("landing.intro")}
          eyebrow={t("landing.whatThisAppDoes")}
          title={t("landing.clubsAndEvents")}
        />
        <ol className="landing-features mt-10 grid gap-3 md:grid-cols-6">
          {features.map((feature, index) => (
            <li className="landing-feature" key={feature.title}>
              <span className="landing-feature-number font-display">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-8 text-lg font-bold leading-snug">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {feature.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <SectionIntro
          description={t("landing.audienceDescription")}
          eyebrow={t("landing.audienceEyebrow")}
          title={t("landing.whoIsThisFor")}
        />
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {audiences.map((audience) => (
            <article
              className="landing-audience"
              data-tone={audience.tone}
              key={audience.title}
            >
              <span className="landing-audience-icon">
                <AudienceIcon icon={audience.icon} />
              </span>
              <h3 className="mt-16 font-display text-2xl font-semibold">
                {audience.title}
              </h3>
              <p className="mt-3 text-sm leading-6 opacity-80">{audience.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionIntro
            description={t("landing.workflowDescription")}
            eyebrow={t("landing.pilotWorkflow")}
            title={t("landing.workflowTitle")}
          />
          <ol className="landing-steps mt-12 grid gap-8 md:grid-cols-5 md:gap-4">
            {workflowSteps.map((step, index) => (
              <li className="landing-step" key={step}>
                <span className="landing-step-dot font-display">{index + 1}</span>
                <p className="mt-4 text-base font-bold leading-snug">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="landing-trust grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="page-eyebrow">{t("landing.trustEyebrow")}</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">
              {t("landing.privateByDesign")}
            </h2>
            <p className="mt-4 max-w-md leading-7 opacity-75">
              {t("landing.privateByDesignBody")}
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {trustItems.map((item) => (
              <li className="landing-trust-item" key={item}>
                <Check />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandMark className="h-8 w-8" />
            <span className="font-display font-semibold text-[var(--foreground)]">
              {t("app.name")}
            </span>
          </div>
          <p>{t("app.subtitle")}</p>
        </div>
      </footer>
    </main>
  );
}

function SectionIntro({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-end">
      <div>
        <p className="page-eyebrow">{eyebrow}</p>
        <h2 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">
          {title}
        </h2>
      </div>
      <p className="max-w-md leading-7 text-[var(--muted)] md:justify-self-end">
        {description}
      </p>
    </div>
  );
}

type PosterLabels = {
  approved: string;
  arts: string;
  attendance: string;
  checkIn: string;
  events: string;
  inviteRow: string;
  invites: string;
  qrReady: string;
  sports: string;
  verified: string;
};

// A decorative collage of the things the app manages: an approved event
// poster, a QR check-in pass and a one-time invite code.
function PosterWall({ labels }: { labels: PosterLabels }) {
  return (
    <div aria-hidden="true" className="poster-wall">
      <div className="poster poster-event">
        <span className="poster-chip">{labels.events}</span>
        <p className="mt-auto font-display text-4xl font-semibold leading-none sm:text-5xl">
          {labels.sports}
        </p>
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <Check />
          {labels.approved}
        </p>
      </div>

      <div className="poster poster-pass">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold">{labels.checkIn}</span>
          <span className="poster-chip poster-chip-ink">{labels.qrReady}</span>
        </div>
        <QrGlyph />
        <p className="text-xs font-semibold opacity-75">{labels.attendance}</p>
      </div>

      <div className="poster poster-invite">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          {labels.invites}
        </span>
        <p className="poster-code mt-3 font-display font-semibold">K7Q2·9XMD</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{labels.inviteRow}</p>
        <span className="poster-chip poster-chip-success mt-4">{labels.verified}</span>
      </div>

      <div className="poster poster-sticker font-display">{labels.arts}</div>
    </div>
  );
}

function QrGlyph() {
  // A fixed 7x7 pattern that reads as a QR code at a glance.
  const pattern = [
    "1110111",
    "1010101",
    "1110011",
    "0001100",
    "1101011",
    "1010110",
    "1110101",
  ];

  return (
    <svg className="my-4 h-24 w-24" viewBox="0 0 7 7">
      {pattern.flatMap((row, y) =>
        row.split("").map((cell, x) =>
          cell === "1" ? (
            <rect
              fill="currentColor"
              height="0.86"
              key={`${x}-${y}`}
              rx="0.18"
              width="0.86"
              x={x + 0.07}
              y={y + 0.07}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      className="motion-directional ml-2 h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

type AudienceIconName = "admin" | "teacher" | "student";

function AudienceIcon({ icon }: { icon: AudienceIconName }) {
  const paths: Record<AudienceIconName, ReactNode> = {
    admin: (
      <>
        <path d="M4 21V9l8-6 8 6v12" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
    student: (
      <>
        <path d="M2 9l10-5 10 5-10 5z" />
        <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
      </>
    ),
    teacher: (
      <>
        <rect height="12" rx="1" width="18" x="3" y="4" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {paths[icon]}
    </svg>
  );
}
