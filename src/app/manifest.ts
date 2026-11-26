import type { MetadataRoute } from "next";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";

// Lets students add the app to their phone's home screen and open it full
// screen, without a browser bar. Most students use the app on a phone.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const dictionary = getDictionary(await getCurrentLocale());
  const t = (key: string) => translate(dictionary, key);

  return {
    id: "/",
    name: t("app.name"),
    short_name: t("app.shortName"),
    description: t("metadata.description"),
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6fb",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
