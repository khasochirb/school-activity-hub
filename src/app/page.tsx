import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { HomepageActivityFlow } from "@/components/homepage-activity-flow";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentTheme } from "@/lib/get-theme";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { CategoryLabel, Cover } from "./(admin)/_components/clean-ui";
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

  const featureIcons = ["key", "calendar", "check", "qr", "chart"] as const;
  const featureColors = ["#2340d9", "#f2643f", "#12804a", "#6b4fd6", "#b25e00"];
  const audienceColors = ["#2340d9", "#12804a", "#f2643f"];
  const audienceLists = [
    [t("landing.clean.admins1"), t("landing.clean.admins2"), t("landing.clean.admins3")],
    [t("landing.clean.teachers1"), t("landing.clean.teachers2"), t("landing.clean.teachers3")],
    [t("landing.clean.students1"), t("landing.clean.students2"), t("landing.clean.students3")],
  ];

  return (
    <main className="cl-land min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="cl-land-top">
        <div className="cl-land-wrap flex items-center gap-3">
          <Link className="flex shrink-0 items-center gap-2.5 font-bold" href="/">
            <BrandMark className="h-8 w-8" />
            <span className="hidden whitespace-nowrap min-[420px]:inline">{t("app.name")}</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <LanguageSwitcher
              className="w-auto"
              currentLocale={locale}
              label={t("language.label")}
              labels={{
                en: t("language.en"),
                mn: t("language.mn"),
              }}
            />
            <span className="hidden sm:block">
            <ThemeToggle
              compact
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
            </span>
            <Link className="cl-btn-soft" href={user ? "/dashboard" : "/login"}>
              {user ? t("landing.goToDashboard") : t("landing.signIn")}
            </Link>
          </nav>
        </div>
      </header>

      <div className="cl-land-wrap flex flex-col gap-16 pb-16 sm:gap-20">
        <section className="cl-land-hero">
          <div className="min-w-0">
            <span className="cl-land-eyebrow">{t("landing.platformEyebrow")}</span>
            <h1>{t("landing.headline")}</h1>
            <p className="cl-land-lead">{t("landing.intro")}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {user ? (
                <Link className="btn btn-primary btn-lg" href="/dashboard">
                  {t("landing.goToDashboard")}
                  <Arrow />
                </Link>
              ) : (
                <>
                  <Link className="btn btn-primary btn-lg gap-2" href="/join">
                    <LandingIcon name="key" />
                    {t("landing.studentJoinWithInvite")}
                  </Link>
                  <Link className="cl-btn-soft min-h-12 px-5 text-[15px]" href="/login">
                    {t("landing.staffSignIn")}
                  </Link>
                </>
              )}
            </div>
            {!user ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
                <LandingIcon name="key" />
                {t("landing.studentInviteHelper")}
              </p>
            ) : null}
          </div>

          <div aria-hidden="true" className="cl-land-stack">
            <span className="cl-land-ping">
              <span className="cl-av">QR</span>
              {t("landing.checkIn")} · {t("landing.qrReady")}
              <i />
            </span>
            <div className="cl-card cl-land-card cl-land-s1">
              <Cover category="Academic" imageUrl={null} initials="" />
              <div className="p-3.5">
                <CategoryLabel category="Academic" label={t("landing.activityStream.workshops")} />
                <b className="mt-1.5 block">{t("landing.clubsAndEvents")}</b>
                <span className="text-[13px] text-[var(--muted)]">{t("landing.activityRowClubs")}</span>
              </div>
            </div>
            <div className="cl-card cl-land-card cl-land-s2">
              <Cover category="Sports" imageUrl={null} initials="" />
              <div className="p-3.5">
                <CategoryLabel category="Sports" label={t("categories.sports")} />
                <b className="mt-1.5 block">{t("landing.events")}</b>
                <span className="text-[13px] text-[var(--muted)]">{t("landing.activityRowAttendance")}</span>
              </div>
            </div>
            <div className="cl-card cl-land-s3">
              <div className="mb-2">
                <b className="block">{t("landing.schoolPilotSnapshot")}</b>
                <span className="text-[13px] text-[var(--muted)]">{t("landing.activityWeekOverview")}</span>
              </div>
              {(
                [
                  ["calendar", "#2340d9", t("landing.activityLabelClubs"), t("landing.activityRowClubs")],
                  ["qr", "#12804a", t("landing.activityLabelAttendance"), t("landing.activityRowAttendance")],
                  ["key", "#f2643f", t("landing.activityLabelInvites"), t("landing.activityRowInvites")],
                ] as const
              ).map(([icon, color, label, value]) => (
                <div className="cl-land-snap" key={label}>
                  <span className="cl-land-tile" style={{ "--c": color } as CSSProperties}>
                    <LandingIcon name={icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <small>{label}</small>
                    <b>{value}</b>
                  </span>
                  <span className="text-[var(--cl-green)]">
                    <Check />
                  </span>
                </div>
              ))}
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="cl-tag" data-tone="ok">{t("landing.qrReady")}</span>
                <span className="cl-tag" data-tone="blue">{t("landing.verifiedStudentsOnly")}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="cl-card cl-land-stream">
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
        </div>

        <section aria-labelledby="land-what" className="flex flex-col gap-7">
          <SectionIntro
            description={t("landing.clean.whatBody")}
            eyebrow={t("landing.verifiedAccess")}
            id="land-what"
            title={t("landing.whatThisAppDoes")}
          />
          <div className="cl-land-feat">
            {features.map((feature, index) => (
              <div className="cl-card" key={feature.title}>
                <span className="cl-land-tile" style={{ "--c": featureColors[index] } as CSSProperties}>
                  <LandingIcon name={featureIcons[index]} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="land-who" className="flex flex-col gap-7">
          <SectionIntro
            description={t("landing.audienceDescription")}
            eyebrow={t("landing.audienceEyebrow")}
            id="land-who"
            title={t("landing.whoIsThisFor")}
          />
          <div className="cl-land-who">
            {audiences.map((audience, index) => (
              <article
                className="cl-card"
                key={audience.title}
                style={{ "--c": audienceColors[index] } as CSSProperties}
              >
                <div className="cl-land-band">
                  <span className="cl-land-avatar">
                    <AudienceIcon icon={audience.icon} />
                  </span>
                </div>
                <div className="p-5 pt-8">
                  <h3>{audience.title}</h3>
                  <p>{audience.body}</p>
                  <ul>
                    {audienceLists[index].map((item) => (
                      <li key={item}>
                        <Check />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="land-pilot" className="flex flex-col gap-7">
          <SectionIntro
            description={t("landing.workflowDescription")}
            eyebrow={t("landing.pilotWorkflow")}
            id="land-pilot"
            title={t("landing.workflowTitle")}
          />
          <ol className="cl-land-steps">
            {workflowSteps.map((step, index) => (
              <li className="cl-card" key={step}>
                <span className="cl-land-n">{index + 1}</span>
                <b>{step}</b>
                <p>{t(`landing.clean.step${index + 1}`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="land-trust" className="cl-card cl-land-trust">
          <div>
            <span className="cl-land-eyebrow">{t("landing.trustEyebrow")}</span>
            <h2 id="land-trust">{t("landing.privateByDesign")}</h2>
            <p>{t("landing.privateByDesignBody")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="cl-btn-soft" href="/join">
                {t("landing.joinWithInviteCode")}
              </Link>
              <Link className="cl-btn-soft" href="/privacy">
                {t("landing.clean.privacyLink")}
              </Link>
            </div>
          </div>
          <ul>
            {trustItems.map((item) => (
              <li key={item}>
                <span className="text-[var(--cl-green)]">
                  <Check />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <footer className="cl-land-foot">
          <span className="flex flex-wrap items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <b>{t("app.name")}</b>
            <span className="text-[var(--muted)]">{t("landing.platformEyebrow")}</span>
          </span>
          <nav className="flex flex-wrap gap-4">
            <Link href="/privacy">{t("landing.clean.privacyLink")}</Link>
            <Link href="/login">{t("landing.signIn")}</Link>
            <Link href="/join">{t("landing.joinWithInviteCode")}</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}

function SectionIntro({
  description,
  eyebrow,
  id,
  title,
}: {
  description: string;
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <div className="cl-land-sh">
      <span className="cl-land-eyebrow">{eyebrow}</span>
      <h2 id={id}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

type LandingIconName = "calendar" | "chart" | "check" | "key" | "qr";

function LandingIcon({ name }: { name: LandingIconName }) {
  const paths: Record<LandingIconName, ReactNode> = {
    calendar: (
      <>
        <rect height="15.5" rx="3" width="17" x="3.5" y="5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l3 3 5-6" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
      </>
    ),
    qr: (
      <>
        <rect height="6" rx="1" width="6" x="3" y="3" />
        <rect height="6" rx="1" width="6" x="15" y="3" />
        <rect height="6" rx="1" width="6" x="3" y="15" />
        <path d="M15 15h2v2h-2zM19 19h2v2h-2zM15 19h2M19 15v2" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
      {paths[name]}
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
