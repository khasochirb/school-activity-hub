import type { Metadata } from "next";
import { ToastProvider } from "@/components/toast-provider";
import { getCurrentTheme } from "@/lib/get-theme";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import {
  DEFAULT_THEME,
  SUPPORTED_THEMES,
  THEME_COOKIE,
} from "@/lib/theme";
import "@fontsource-variable/onest";
import "@fontsource-variable/noto-serif-display/standard.css";
import "@fontsource-variable/noto-serif-display/standard-italic.css";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return {
    title: t("app.name"),
    description: t("metadata.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const theme = await getCurrentTheme();
  const htmlClassName =
    theme === "dark" ? "dark h-full antialiased" : "h-full antialiased";

  return (
    <html
      className={htmlClassName}
      data-theme={theme}
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: getThemeInitScript(),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider
          labels={{
            close: t("common.close"),
            error: t("feedback.error"),
            info: t("feedback.info"),
            success: t("feedback.success"),
            warning: t("feedback.warning"),
          }}
        >
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

function getThemeInitScript() {
  const cookieName = JSON.stringify(THEME_COOKIE);
  const defaultTheme = JSON.stringify(DEFAULT_THEME);
  const supportedThemes = JSON.stringify(SUPPORTED_THEMES);

  return `
(() => {
  try {
    const cookieName = ${cookieName};
    const defaultTheme = ${defaultTheme};
    const supportedThemes = ${supportedThemes};
    const cookieMatch = document.cookie.match(new RegExp("(?:^|; )" + cookieName + "=([^;]*)"));
    const cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : "";
    const storedTheme = localStorage.getItem(cookieName) || "";
    const theme = supportedThemes.includes(cookieTheme)
      ? cookieTheme
      : supportedThemes.includes(storedTheme)
        ? storedTheme
        : defaultTheme;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDarkTheme = theme === "dark" || (theme === "system" && systemPrefersDark);

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", shouldUseDarkTheme);
    document.documentElement.style.colorScheme = shouldUseDarkTheme ? "dark" : "light";

    if (!cookieTheme && storedTheme === theme) {
      document.cookie = cookieName + "=" + encodeURIComponent(theme) + "; path=/; max-age=31536000; SameSite=Lax";
    }
  } catch {}
})();
`;
}
