import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatCalendarDateBadge, formatTime } from "@/lib/i18n/date-format";
import { getPublicActivities, getPublicClubs } from "@/lib/site/school-site";
import { getSiteLabels, loadPublicSite } from "./site-data";
import { SiteFrame, SiteHome } from "./site-view";
import { VisitBeacon } from "./visit-beacon";

type Params = { params: Promise<{ school: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const site = await loadPublicSite((await params).school);

  return site ? { title: site.school.name } : {};
}

// Public: no sign-in. Shows only published pages, approved upcoming activities
// and club names of an active school.
export default async function SchoolSiteHome({ params }: Params) {
  const { school: slug } = await params;
  const site = await loadPublicSite(slug);

  if (!site) {
    notFound();
  }

  const [{ labels, locale }, activities, clubs] = await Promise.all([
    getSiteLabels(),
    getPublicActivities(site.school.id, 3),
    getPublicClubs(site.school.id),
  ]);

  return (
    <SiteFrame labels={labels} schoolName={site.school.name} schoolSlug={site.school.slug} tree={site.tree}>
      <VisitBeacon school={site.school.slug} />
      <SiteHome
        activities={activities}
        clubs={clubs}
        labels={labels}
        schoolName={site.school.name}
        schoolSlug={site.school.slug}
        tree={site.tree}
        when={(activity) => {
          const zone = site.school.timezone;
          const tile = formatCalendarDateBadge(activity.starts_at, locale, zone);

          return {
            day: String(Number(tile.day)),
            month: tile.month,
            time: `${formatTime(activity.starts_at, locale, zone)} – ${formatTime(activity.ends_at, locale, zone)}`,
          };
        }}
      />
    </SiteFrame>
  );
}
