import Link from "next/link";
import type { ReactNode } from "react";
import { BrandGlyph } from "@/components/brand-mark";
import { getActivityCategoryTone } from "@/lib/activity-category-styles";
import { bodyParagraphs, type SitePage, type SitePageNode } from "@/lib/site/page-tree";
import type { PublicActivity, PublicClub } from "@/lib/site/school-site";

export type SiteLabels = {
  appName: string;
  clubs: string;
  home: string;
  noPages: string;
  signIn: string;
  upcoming: string;
  upcomingEmpty: string;
};

export type ActivityWhen = { day: string; month: string; time: string };

// The public school site. These components only draw what they are given, so
// they hold no queries: the route files load published content and pass it in.
// Layout: a utility bar and a main menu, the page, then a footer that lists
// every section, like a school or university site.
export function SiteFrame({
  children,
  labels,
  schoolName,
  schoolSlug,
  tree,
}: {
  children: ReactNode;
  labels: SiteLabels;
  schoolName: string;
  schoolSlug: string;
  tree: SitePageNode[];
}) {
  const base = `/s/${schoolSlug}`;

  return (
    <div className="site-shell">
      <div className="site-utility">
        <div className="site-utility-inner">
          <span className="min-w-0 truncate">{labels.appName}</span>
          <Link href="/login" prefetch={false}>
            {labels.signIn} →
          </Link>
        </div>
      </div>
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="site-brand" href={base} prefetch={false}>
            <span aria-hidden="true" className="brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <BrandGlyph />
            </span>
            <span className="site-brand-name">{schoolName}</span>
          </Link>
          <nav aria-label={schoolName} className="site-nav">
            <Link className="site-nav-link" href={base} prefetch={false}>
              {labels.home}
            </Link>
            {tree.map((page) =>
              page.children.length ? (
                <details className="site-nav-group" key={page.id}>
                  <summary className="site-nav-link">
                    {page.title}
                    <Chevron />
                  </summary>
                  <div className="site-nav-menu">
                    <Link href={`${base}/${page.slug}`} prefetch={false}>
                      {page.title}
                    </Link>
                    {page.children.map((child) => (
                      <Link href={`${base}/${child.slug}`} key={child.id} prefetch={false}>
                        {child.title}
                      </Link>
                    ))}
                  </div>
                </details>
              ) : (
                <Link className="site-nav-link" href={`${base}/${page.slug}`} key={page.id} prefetch={false}>
                  {page.title}
                </Link>
              ),
            )}
          </nav>
        </div>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <span aria-hidden="true" className="brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <BrandGlyph />
            </span>
            <span>{schoolName}</span>
          </div>
          <div className="site-footer-cols">
            {tree.map((page) => (
              <div key={page.id}>
                <Link className="site-footer-head" href={`${base}/${page.slug}`} prefetch={false}>
                  {page.title}
                </Link>
                {page.children.map((child) => (
                  <Link href={`${base}/${child.slug}`} key={child.id} prefetch={false}>
                    {child.title}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="site-footer-base">{labels.appName}</div>
      </footer>
    </div>
  );
}

export function SiteHome({
  activities,
  clubs,
  labels,
  schoolName,
  schoolSlug,
  tree,
  when,
}: {
  activities: PublicActivity[];
  clubs: PublicClub[];
  labels: SiteLabels;
  schoolName: string;
  schoolSlug: string;
  tree: SitePageNode[];
  when: (activity: PublicActivity) => ActivityWhen;
}) {
  const base = `/s/${schoolSlug}`;
  const next = activities[0];
  const nextWhen = next ? when(next) : null;

  return (
    <>
      <section className="site-hero">
        <div className="site-hero-text">
          <h1>{schoolName}</h1>
        </div>
        {next && nextWhen ? (
          <div className="site-hero-next">
            <span className="site-hero-next-label">{labels.upcoming}</span>
            <div className="site-hero-next-row">
              <DateTile when={nextWhen} />
              <div className="min-w-0">
                <p className="site-hero-next-title">{next.title}</p>
                <p className="site-hero-next-meta">
                  {nextWhen.time}
                  {next.location ? ` · ${next.location}` : ""}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {tree.length ? (
        <section className="site-tiles">
          {tree.map((page, index) => (
            <Link className="site-tile" href={`${base}/${page.slug}`} key={page.id} prefetch={false}>
              <span aria-hidden="true" className="site-tile-icon" data-n={index % 5}>
                <SectionIcon index={index} />
              </span>
              <span className="site-tile-title">{page.title}</span>
              {page.children.length ? (
                <span className="site-tile-sub">
                  {page.children.map((child) => child.title).join(" · ")}
                </span>
              ) : null}
              <span aria-hidden="true" className="site-tile-arrow">
                →
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <p className="site-empty">{labels.noPages}</p>
      )}

      <div className="site-columns">
        <section>
          <h2 className="site-h2">{labels.upcoming}</h2>
          {activities.length ? (
            <ul className="site-list">
              {activities.map((activity) => {
                const activityWhen = when(activity);

                return (
                  <li className="site-event" key={activity.id}>
                    <DateTile when={activityWhen} />
                    <div className="min-w-0">
                      <p className="site-list-title">{activity.title}</p>
                      <p className="site-list-meta">
                        {activityWhen.time}
                        {activity.location ? ` · ${activity.location}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="site-empty">{labels.upcomingEmpty}</p>
          )}
        </section>
        {clubs.length ? (
          <section>
            <h2 className="site-h2">{labels.clubs}</h2>
            <ul className="site-list">
              {clubs.map((club) => (
                <li className="site-event" key={club.id}>
                  <span
                    aria-hidden="true"
                    className="club-tile grid h-12 w-12 shrink-0 place-items-center rounded-xl border text-lg font-bold"
                    data-category-tone={getActivityCategoryTone(club.category)}
                  >
                    {Array.from(club.name.trim())[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="site-list-title">{club.name}</p>
                    {club.description ? (
                      <p className="site-list-meta line-clamp-2">{club.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}

export function SitePageView({
  childPages,
  page,
  parent,
  schoolSlug,
  siblings,
}: {
  childPages: SitePage[];
  page: SitePage;
  parent: SitePage | null;
  schoolSlug: string;
  siblings: SitePage[];
}) {
  const base = `/s/${schoolSlug}`;
  const paragraphs = bodyParagraphs(page.body);
  const sectionRoot = parent ?? page;
  const sectionPages = parent ? siblings : childPages;

  return (
    <>
      <section className="site-pagehead">
        {parent ? (
          <Link className="site-crumb" href={`${base}/${parent.slug}`} prefetch={false}>
            ← {parent.title}
          </Link>
        ) : null}
        <h1>{page.title}</h1>
      </section>
      <div className="site-page-grid">
        <article className="site-article">
          {paragraphs.map((paragraph, index) => (
            <p className="whitespace-pre-line" key={index}>
              {paragraph}
            </p>
          ))}
          {!parent && childPages.length ? (
            <div className="site-tiles">
              {childPages.map((child) => (
                <Link className="site-tile" href={`${base}/${child.slug}`} key={child.id} prefetch={false}>
                  <span className="site-tile-title">{child.title}</span>
                  <span aria-hidden="true" className="site-tile-arrow">
                    →
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </article>
        {sectionPages.length ? (
          <aside className="site-sidenav">
            <Link
              aria-current={sectionRoot.id === page.id ? "page" : undefined}
              className="site-sidenav-head"
              href={`${base}/${sectionRoot.slug}`}
              prefetch={false}
            >
              {sectionRoot.title}
            </Link>
            {sectionPages.map((sectionPage) => (
              <Link
                aria-current={sectionPage.id === page.id ? "page" : undefined}
                href={`${base}/${sectionPage.slug}`}
                key={sectionPage.id}
                prefetch={false}
              >
                {sectionPage.title}
              </Link>
            ))}
          </aside>
        ) : null}
      </div>
    </>
  );
}

function DateTile({ when }: { when: ActivityWhen }) {
  return (
    <span aria-hidden="true" className="cl-dtile">
      <span>{when.month}</span>
      <b>{when.day}</b>
    </span>
  );
}

function Chevron() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const SECTION_ICONS = [
  ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21c.8-4 4-6 8-6s7.2 2 8 6"],
  ["M3 21h18", "M5 21V8l7-5 7 5v13", "M9 21v-6h6v6"],
  ["M5 4h11a2 2 0 0 1 2 2v13a1 1 0 0 0 2 0V8", "M5 4a1 1 0 0 0-1 1v13a2 2 0 0 0 2 2h13", "M8 8h6M8 12h6M8 16h4"],
  ["M8 21h8M12 17v4", "M7 4h10v5a5 5 0 0 1-10 0z", "M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"],
  ["M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M3 9h18M8 2v4M16 2v4"],
];

function SectionIcon({ index }: { index: number }) {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      {SECTION_ICONS[index % SECTION_ICONS.length].map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}
