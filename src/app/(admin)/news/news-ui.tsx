import Image from "next/image";
import Link from "next/link";
import { getActivityCategoryTone } from "@/lib/activity-category-styles";

export type NewsReport = {
  attendance: { checkedIn: number; registered: number } | null;
  category: string | null;
  categoryLabel: string | null;
  clubName: string | null;
  dateLabel: string;
  description: string | null;
  href: string;
  id: string;
  location: string | null;
  posterUrl: string | null;
  title: string;
};

export type NewsAdvert = {
  eligibility: string | null;
  href: string;
  id: string;
  logoUrl: string | null;
  meetingLocation: string | null;
  meetingSchedule: string | null;
  memberCount: number | null;
  name: string;
  tagline: string | null;
};

export type NewsUpcoming = {
  dateLabel: string;
  href: string;
  id: string;
  location: string | null;
  title: string;
};

export type NewsLabels = {
  advertKicker: string;
  attendanceHeading: string;
  checkedIn: string;
  clubNotices: string;
  comingUp: string;
  eventReport: string;
  heldOn: (date: string) => string;
  members: (count: number) => string;
  meets: string;
  moreReports: string;
  noSummary: string;
  noUpcoming: string;
  posterAlt: (event: string) => string;
  readMore: string;
  registered: string;
  reportFrom: (club: string) => string;
  schoolEvent: string;
  visitClub: string;
  where: string;
  whoCanJoin: string;
};

export function NewsMasthead({
  dateLabel,
  schoolName,
  tagline,
  title,
}: {
  dateLabel: string;
  schoolName: string | null;
  tagline: string;
  title: string;
}) {
  return (
    <header className="news-masthead">
      <div className="news-masthead-meta">
        <span>{dateLabel}</span>
        {schoolName ? <span>{schoolName}</span> : null}
      </div>
      <h1 className="news-masthead-title font-display">{title}</h1>
      <p className="news-masthead-tagline">{tagline}</p>
    </header>
  );
}

export function NewsLeadReport({
  labels,
  report,
}: {
  labels: NewsLabels;
  report: NewsReport;
}) {
  return (
    <article className="news-lead">
      <p className="news-kicker">
        {labels.eventReport}
        {report.categoryLabel ? <span> · {report.categoryLabel}</span> : null}
      </p>
      <h2 className="news-lead-title font-display">
        <Link href={report.href} prefetch={false}>
          {report.title}
        </Link>
      </h2>
      <p className="news-byline">
        {report.clubName
          ? labels.reportFrom(report.clubName)
          : labels.schoolEvent}
        <span aria-hidden="true"> · </span>
        {labels.heldOn(report.dateLabel)}
        {report.location ? (
          <>
            <span aria-hidden="true"> · </span>
            {report.location}
          </>
        ) : null}
      </p>

      <NewsPoster labels={labels} large report={report} />

      <div className="news-lead-body">
        <p className="news-dropcap">{report.description || labels.noSummary}</p>
      </div>

      {report.attendance ? (
        <aside className="news-figures">
          <p className="news-figures-heading">{labels.attendanceHeading}</p>
          <dl>
            <div>
              <dt>{labels.registered}</dt>
              <dd className="font-display">{report.attendance.registered}</dd>
            </div>
            <div>
              <dt>{labels.checkedIn}</dt>
              <dd className="font-display">{report.attendance.checkedIn}</dd>
            </div>
          </dl>
        </aside>
      ) : null}

      <Link className="news-read-more" href={report.href} prefetch={false}>
        {labels.readMore}
        <span aria-hidden="true"> →</span>
      </Link>
    </article>
  );
}

export function NewsBriefReport({
  labels,
  report,
}: {
  labels: NewsLabels;
  report: NewsReport;
}) {
  return (
    <article className="news-brief">
      <NewsPoster labels={labels} report={report} />
      <p className="news-kicker">
        {report.clubName ?? labels.schoolEvent}
      </p>
      <h3 className="news-brief-title font-display">
        <Link href={report.href} prefetch={false}>
          {report.title}
        </Link>
      </h3>
      <p className="news-byline">{labels.heldOn(report.dateLabel)}</p>
      <p className="news-brief-body">{report.description || labels.noSummary}</p>
    </article>
  );
}

function NewsPoster({
  labels,
  large = false,
  report,
}: {
  labels: NewsLabels;
  large?: boolean;
  report: NewsReport;
}) {
  return (
    <figure
      className={large ? "news-poster news-poster-large" : "news-poster"}
      data-category-tone={getActivityCategoryTone(report.category)}
    >
      {report.posterUrl ? (
        <Image
          alt={labels.posterAlt(report.title)}
          className="object-cover"
          fill
          sizes={large ? "(min-width: 1024px) 720px, 100vw" : "(min-width: 768px) 360px, 100vw"}
          src={report.posterUrl}
          unoptimized
        />
      ) : (
        <span aria-hidden="true" className="news-poster-fallback font-display">
          {report.categoryLabel ?? report.title}
        </span>
      )}
    </figure>
  );
}

export function NewsClubAdvert({
  advert,
  labels,
}: {
  advert: NewsAdvert;
  labels: NewsLabels;
}) {
  return (
    <article className="news-advert">
      <p className="news-advert-kicker">{labels.advertKicker}</p>
      {advert.logoUrl ? (
        <Image
          alt=""
          className="news-advert-logo"
          height={56}
          src={advert.logoUrl}
          unoptimized
          width={56}
        />
      ) : null}
      <h3 className="news-advert-name font-display">{advert.name}</h3>
      {advert.tagline ? (
        <p className="news-advert-tagline font-display">{advert.tagline}</p>
      ) : null}
      <dl className="news-advert-details">
        {advert.meetingSchedule ? (
          <div>
            <dt>{labels.meets}</dt>
            <dd>{advert.meetingSchedule}</dd>
          </div>
        ) : null}
        {advert.meetingLocation ? (
          <div>
            <dt>{labels.where}</dt>
            <dd>{advert.meetingLocation}</dd>
          </div>
        ) : null}
        {advert.eligibility ? (
          <div>
            <dt>{labels.whoCanJoin}</dt>
            <dd>{advert.eligibility}</dd>
          </div>
        ) : null}
      </dl>
      {advert.memberCount !== null ? (
        <p className="news-advert-members">{labels.members(advert.memberCount)}</p>
      ) : null}
      <Link className="btn btn-primary w-full" href={advert.href} prefetch={false}>
        {labels.visitClub}
      </Link>
    </article>
  );
}

export function NewsComingUp({
  events,
  labels,
}: {
  events: NewsUpcoming[];
  labels: NewsLabels;
}) {
  return (
    <section className="news-sidebar-section">
      <h2 className="news-section-heading">{labels.comingUp}</h2>
      {events.length ? (
        <ol className="news-coming-up">
          {events.map((event) => (
            <li key={event.id}>
              <p className="news-coming-up-date">{event.dateLabel}</p>
              <Link
                className="news-coming-up-title font-display"
                href={event.href}
                prefetch={false}
              >
                {event.title}
              </Link>
              {event.location ? (
                <p className="news-coming-up-location">{event.location}</p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-[var(--muted)]">{labels.noUpcoming}</p>
      )}
    </section>
  );
}

export function NewsFront({
  adverts,
  labels,
  reports,
  upcoming,
}: {
  adverts: NewsAdvert[];
  labels: NewsLabels;
  reports: NewsReport[];
  upcoming: NewsUpcoming[];
}) {
  const [lead, ...more] = reports;

  return (
    <>
      <div className="news-front">
        <div className="min-w-0">
          {lead ? <NewsLeadReport labels={labels} report={lead} /> : null}
        </div>
        <aside className="news-sidebar">
          <NewsComingUp events={upcoming} labels={labels} />
          {adverts.length ? (
            <section className="news-sidebar-section">
              <h2 className="news-section-heading">{labels.clubNotices}</h2>
              <div className="grid gap-4">
                {adverts.map((advert) => (
                  <NewsClubAdvert advert={advert} key={advert.id} labels={labels} />
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {more.length ? (
        <section className="news-more">
          <h2 className="news-section-heading">{labels.moreReports}</h2>
          <div className="news-more-grid">
            {more.map((report) => (
              <NewsBriefReport key={report.id} labels={labels} report={report} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
