import Link from "next/link";
import { getCurrentSafeguardingAccess } from "@/lib/auth/sensitive-workflows";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { PageHeader } from "../_components/page-ui";

export default async function SafetyPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const access = await getCurrentSafeguardingAccess();

  return (
    <div className="page-stack">
      <PageHeader
        description={t("safety.description")}
        title={t("safety.title")}
      />

      <section className="notice-box notice-warning">
        <h2 className="font-bold">{t("safety.urgent.title")}</h2>
        <p className="mt-2 text-sm leading-6">{t("safety.urgent.notEmergency")}</p>
        <p className="mt-2 text-sm leading-6">{t("safety.urgent.urgentProcess")}</p>
        <p className="mt-2 text-sm leading-6">{t("safety.urgent.designatedOnly")}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SafetyLinkCard
          description={t("safety.cards.reportDescription")}
          href="/safety/report"
          label={t("safety.cards.reportAction")}
          title={t("safety.cards.reportTitle")}
        />
        <SafetyLinkCard
          description={t("safety.cards.myReportsDescription")}
          href="/safety/my-reports"
          label={t("safety.cards.myReportsAction")}
          title={t("safety.cards.myReportsTitle")}
        />
      </section>

      <section className="section-card section-card-padded">
        <h2 className="section-title">{t("safety.confidentiality.title")}</h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700">
          <p>{t("safety.confidentiality.identity")}</p>
          <p>{t("safety.confidentiality.restricted")}</p>
          <p>{t("safety.confidentiality.offline")}</p>
        </div>
      </section>

      {access.isDesignated ? (
        <SafetyLinkCard
          description={t("safety.cards.inboxDescription")}
          href="/safety/reports"
          label={t("safety.cards.inboxAction")}
          title={t("safety.cards.inboxTitle")}
        />
      ) : null}

      {access.profile?.role === "school_admin" ? (
        <SafetyLinkCard
          description={t("safety.cards.designationsDescription")}
          href="/safety/designations"
          label={t("safety.cards.designationsAction")}
          title={t("safety.cards.designationsTitle")}
        />
      ) : null}
    </div>
  );
}

function SafetyLinkCard({
  description,
  href,
  label,
  title,
}: {
  description: string;
  href: string;
  label: string;
  title: string;
}) {
  return (
    <section className="section-card section-card-padded flex min-w-0 flex-col">
      <h2 className="section-title">{title}</h2>
      <p className="section-description flex-1">{description}</p>
      <div className="mt-4">
        <Link className="btn btn-primary w-full sm:w-auto" href={href} prefetch={false}>
          {label}
        </Link>
      </div>
    </section>
  );
}
