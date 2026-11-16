import "server-only";

import { cache } from "react";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getPublicSite } from "@/lib/site/school-site";
import type { SiteLabels } from "./site-view";

// One load per request, shared by the layout-less home and page routes.
export const loadPublicSite = cache(async (slug: string) => getPublicSite(slug));

export async function getSiteLabels(): Promise<{ labels: SiteLabels; locale: Awaited<ReturnType<typeof getCurrentLocale>> }> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return {
    labels: {
      appName: t("app.name"),
      clubs: t("nav.clubs"),
      home: t("nav.tabs.home"),
      noPages: t("site.public.noPages"),
      signIn: t("auth.login.signIn"),
      upcoming: t("site.public.upcoming"),
      upcomingEmpty: t("dashboard.upcoming.emptyTitle"),
    },
    locale,
  };
}
