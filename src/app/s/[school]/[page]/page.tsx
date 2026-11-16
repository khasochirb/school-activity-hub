import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteLabels, loadPublicSite } from "../site-data";
import { SiteFrame, SitePageView } from "../site-view";

type Params = { params: Promise<{ page: string; school: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page: pageSlug, school } = await params;
  const site = await loadPublicSite(school);
  const page = site?.pages.find((candidate) => candidate.slug === pageSlug);

  return site && page ? { title: `${page.title} · ${site.school.name}` } : {};
}

// Public: one published page of a school's site.
export default async function SchoolSitePage({ params }: Params) {
  const { page: pageSlug, school: slug } = await params;
  const site = await loadPublicSite(slug);
  const page = site?.pages.find((candidate) => candidate.slug === pageSlug);

  if (!site || !page) {
    notFound();
  }

  const { labels } = await getSiteLabels();

  return (
    <SiteFrame labels={labels} schoolName={site.school.name} schoolSlug={site.school.slug} tree={site.tree}>
      <SitePageView
        childPages={site.pages
          .filter((candidate) => candidate.parent_id === page.id)
          .sort((a, b) => a.position - b.position)}
        page={page}
        parent={site.pages.find((candidate) => candidate.id === page.parent_id) ?? null}
        schoolSlug={site.school.slug}
      />
    </SiteFrame>
  );
}
