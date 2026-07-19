import { requireActiveSchoolProfile } from "@/lib/auth/sensitive-workflows";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { PageHeader } from "../_components/page-ui";

export default async function PrivacyPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  await requireActiveSchoolProfile();

  return (
    <div className="page-stack">
      <PageHeader
        description={t("privacy.description")}
        title={t("privacy.title")}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <InformationCard
          items={[
            t("privacy.operational.items.account"),
            t("privacy.operational.items.activities"),
            t("privacy.operational.items.safety"),
          ]}
          title={t("privacy.operational.title")}
        />
        <InformationCard
          items={[
            t("privacy.access.items.self"),
            t("privacy.access.items.school"),
            t("privacy.access.items.platform"),
          ]}
          title={t("privacy.access.title")}
        />
        <InformationCard
          items={[
            t("privacy.research.items.separate"),
            t("privacy.research.items.noDisadvantage"),
            t("privacy.research.items.noInference"),
          ]}
          title={t("privacy.research.title")}
        />
      </section>

      <section className="section-card section-card-padded">
        <h2 className="section-title">{t("privacy.commitments.title")}</h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
          <p>{t("privacy.commitments.noSale")}</p>
          <p>{t("privacy.commitments.safeguardingLimits")}</p>
        </div>
      </section>

      <section className="notice-box">
        <h2 className="font-bold">{t("privacy.manual.title")}</h2>
        <p className="mt-2 text-sm leading-6">{t("privacy.manual.description")}</p>
      </section>
    </div>
  );
}

function InformationCard({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="section-card section-card-padded">
      <h2 className="section-title">{title}</h2>
      <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
