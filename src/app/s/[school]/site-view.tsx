import Link from "next/link";
import type { ReactNode } from "react";
import { BrandGlyph } from "@/components/brand-mark";
import { bodyParagraphs, type SitePage, type SitePageNode } from "@/lib/site/page-tree";
import type { PublicActivity, PublicClub } from "@/lib/site/school-site";

export type SiteLabels = {
  clubs: string;
  home: string;
  noPages: string;
  signIn: string;
  upcoming: string;
  upcomingEmpty: string;
};

// The public school site. These components only draw what they are given, so
// they hold no queries: the route files load published content and pass it in.
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
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="site-brand" href={base} prefetch={false}>
            <span aria-hidden="true" className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <BrandGlyph />
            </span>
            <span className="min-w-0 truncate">{schoolName}</span>
          </Link>
          <nav aria-label={schoolName} className="site-nav">
            <Link className="site-nav-link" href={base} prefetch={false}>
              {labels.home}
            </Link>
            {tree.map((page) =>
              page.children.length ? (
                <details className="site-nav-group" key={page.id}>
                  <summary className="site-nav-link">{page.title}</summary>
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
          <Link className="btn btn-secondary min-h-9 shrink-0 px-3" href="/login" prefetch={false}>
            {labels.signIn}
          </Link>
        </div>
      </header>
      <main className="site-main">{children}</main>
    </div>
  );
}

export function SiteHome({
  activities,
  clubs,
  dateLabel,
  labels,
  schoolName,
  schoolSlug,
  tree,
}: {
  activities: PublicActivity[];
  clubs: PublicClub[];
  dateLabel: (activity: PublicActivity) => string;
  labels: SiteLabels;
  schoolName: string;
  schoolSlug: string;
  tree: SitePageNode[];
}) {
  const base = `/s/${schoolSlug}`;

  return (
    <>
      <section className="site-hero">
        <h1>{schoolName}</h1>
      </section>

      {tree.length ? (
        <section className="site-tiles">
          {tree.map((page) => (
            <Link className="site-tile" href={`${base}/${page.slug}`} key={page.id} prefetch={false}>
              <span className="site-tile-title">{page.title}</span>
              {page.children.length ? (
                <span className="site-tile-sub">
                  {page.children.map((child) => child.title).join(" · ")}
                </span>
              ) : null}
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
              {activities.map((activity) => (
                <li className="site-list-item" key={activity.id}>
                  <span className="site-list-title">{activity.title}</span>
                  <span className="site-list-meta">
                    {dateLabel(activity)}
                    {activity.location ? ` · ${activity.location}` : ""}
                  </span>
                </li>
              ))}
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
                <li className="site-list-item" key={club.id}>
                  <span className="site-list-title">{club.name}</span>
                  {club.description ? (
                    <span className="site-list-meta line-clamp-2">{club.description}</span>
                  ) : null}
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
}: {
  childPages: SitePage[];
  page: SitePage;
  parent: SitePage | null;
  schoolSlug: string;
}) {
  const base = `/s/${schoolSlug}`;
  const paragraphs = bodyParagraphs(page.body);

  return (
    <article className="site-article">
      {parent ? (
        <Link className="site-crumb" href={`${base}/${parent.slug}`} prefetch={false}>
          ← {parent.title}
        </Link>
      ) : null}
      <h1>{page.title}</h1>
      {paragraphs.map((paragraph, index) => (
        <p className="whitespace-pre-line" key={index}>
          {paragraph}
        </p>
      ))}
      {childPages.length ? (
        <div className="site-tiles">
          {childPages.map((child) => (
            <Link className="site-tile" href={`${base}/${child.slug}`} key={child.id} prefetch={false}>
              <span className="site-tile-title">{child.title}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}
