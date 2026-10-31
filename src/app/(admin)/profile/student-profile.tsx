import Link from "next/link";
import { getActivityCategoryTranslationKey } from "@/lib/activity-categories";
import { formatDateTime } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import {
  buildStudentMilestones,
  initialsForName,
} from "@/lib/students/student-journey";
import type { StudentProfileData } from "@/lib/students/student-profile-data";
import { CategoryBadge } from "../_components/page-ui";

type Translate = (key: string) => string;
type TranslateFormat = (
  key: string,
  values: Record<string, string | number>,
) => string;

export function StudentProfile({
  data,
  displayName,
  gradeLine,
  locale,
  t,
  tf,
}: {
  data: StudentProfileData;
  displayName: string;
  gradeLine: string | null;
  locale: Locale;
  t: Translate;
  tf: TranslateFormat;
}) {
  const milestones = buildStudentMilestones(data.counts);

  return (
    <>
      <section className="section-card section-card-padded">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xl font-bold text-[var(--primary-strong)]"
          >
            {initialsForName(displayName)}
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold break-words text-zinc-950">
              {displayName}
            </h2>
            {gradeLine ? (
              <p className="mt-1 text-sm text-zinc-600">{gradeLine}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section-card section-card-padded">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">{t("studentProfile.interests.title")}</h2>
          {data.interestsAvailable ? (
            <Link
              className="btn btn-secondary min-h-10 px-3 text-sm"
              href="/profile/interests"
              prefetch={false}
            >
              {data.interests.length
                ? t("studentProfile.interests.edit")
                : t("studentProfile.interests.pick")}
            </Link>
          ) : null}
        </div>
        {data.interests.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.interests.map((interest) => (
              <CategoryBadge category={interest} key={interest}>
                {categoryLabel(interest, t)}
              </CategoryBadge>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            {t("studentProfile.interests.empty")}
          </p>
        )}
        <p className="mt-3 text-sm text-zinc-600">{t("studentProfile.privacyNote")}</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="section-card section-card-padded">
          <h2 className="section-title">{t("studentProfile.clubs.title")}</h2>
          {data.clubs.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {data.clubs.map((club) => (
                <li key={club.id}>
                  <Link
                    className="interactive-card flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 hover:border-[var(--primary-border)]"
                    href={`/clubs/${club.id}`}
                    prefetch={false}
                  >
                    <span className="min-w-0 font-medium break-words text-zinc-900">
                      {club.name}
                    </span>
                    {club.category ? (
                      <CategoryBadge category={club.category}>
                        {categoryLabel(club.category, t)}
                      </CategoryBadge>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 flex flex-col items-start gap-3">
              <p className="text-sm text-zinc-600">{t("studentProfile.clubs.empty")}</p>
              <Link className="btn btn-primary min-h-10 px-4 text-sm" href="/clubs" prefetch={false}>
                {t("studentProfile.clubs.find")}
              </Link>
            </div>
          )}
        </section>

        <section className="section-card section-card-padded">
          <h2 className="section-title">{t("studentProfile.upcoming.title")}</h2>
          {data.upcoming.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {data.upcoming.map((event) => (
                <li key={event.id}>
                  <Link
                    className="interactive-card flex flex-col gap-1 rounded-md border border-slate-200 bg-white p-3 hover:border-[var(--primary-border)]"
                    href={`/events/${event.id}`}
                    prefetch={false}
                  >
                    <span className="font-medium break-words text-zinc-900">{event.title}</span>
                    <span className="text-sm text-zinc-600">
                      {formatDateTime(event.starts_at, locale)}
                      {event.location ? ` · ${event.location}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">{t("studentProfile.upcoming.empty")}</p>
          )}
        </section>
      </div>

      <section className="section-card section-card-padded">
        <h2 className="section-title">{t("studentProfile.journey.title")}</h2>
        <p className="section-description">{t("studentProfile.journey.description")}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <JourneyCount
            label={t("studentProfile.journey.clubsJoined")}
            value={data.counts.clubsJoined}
          />
          <JourneyCount
            label={t("studentProfile.journey.sessionsAttended")}
            value={data.counts.sessionsAttended}
          />
          <JourneyCount
            label={t("studentProfile.journey.categoriesTried")}
            value={data.counts.categoriesTried}
          />
          <JourneyCount
            label={t("studentProfile.journey.ideasProposed")}
            value={data.counts.ideasProposed}
          />
        </dl>
        <h3 className="mt-5 text-sm font-semibold text-zinc-950">
          {t("studentProfile.milestones.title")}
        </h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {milestones.map((milestone) => (
            <li
              className={
                milestone.achieved
                  ? "rounded-md border border-[var(--primary-border)] bg-[var(--primary-soft)] p-3"
                  : "rounded-md border border-slate-200 bg-white p-3"
              }
              key={milestone.key}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-zinc-900">
                  {t(`studentProfile.milestones.${milestone.key}.title`)}
                </span>
                <span className="font-mono text-sm tabular-nums text-zinc-700">
                  {milestone.achieved
                    ? t("studentProfile.milestones.done")
                    : tf("studentProfile.milestones.progress", {
                        progress: milestone.progress,
                        target: milestone.target,
                      })}
                </span>
              </div>
              {!milestone.achieved ? (
                <p className="mt-1 text-sm text-zinc-600">
                  {t(`studentProfile.milestones.${milestone.key}.hint`)}
                </p>
              ) : null}
              <div
                aria-hidden="true"
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200"
              >
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: `${(milestone.progress / milestone.target) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function JourneyCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="detail-card">
      <dt className="detail-label">{label}</dt>
      <dd className="detail-value font-mono text-2xl tabular-nums">{value}</dd>
    </div>
  );
}

function categoryLabel(category: string, t: Translate) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}
