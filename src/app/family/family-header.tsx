import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { logout } from "../(admin)/actions";

// The top bar of the parent pages: no school navigation, just the family
// home, language and sign out.
export async function FamilyHeader({ name }: { name: string | null }) {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <header className="family-top">
      <Link className="family-brand" href="/family">
        <BrandMark className="h-9 w-9" />
        <span>
          <b>{t("family.title")}</b>
          <small>{name}</small>
        </span>
      </Link>
      <span className="family-top-actions">
        <LanguageSwitcher
          className="w-auto"
          compact
          currentLocale={locale}
          label={t("language.label")}
          labels={{ en: t("language.en"), mn: t("language.mn") }}
        />
        <form action={logout}>
          <button className="btn btn-quiet min-h-10" type="submit">
            {t("family.signOut")}
          </button>
        </form>
      </span>
    </header>
  );
}
