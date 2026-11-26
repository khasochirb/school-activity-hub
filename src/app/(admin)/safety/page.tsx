import Link from "next/link";
import { getCurrentSafeguardingAccess } from "@/lib/auth/sensitive-workflows";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { Section, Widget } from "../_components/clean-ui";

export default async function SafetyPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const access = await getCurrentSafeguardingAccess();

  return (
    <div className="cl-page">
      <section className="cl-card cl-safehero">
        <div className="min-w-0">
          <h1>{t("safety.title")}</h1>
          <p>{t("safety.description")}</p>
        </div>
        <span aria-hidden="true" className="cl-safeicon">
          <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
            <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
      </section>

      <section className="cl-safenotice" role="note">
        <b>{t("safety.urgent.title")}</b>
        <p>{t("safety.urgent.notEmergency")}</p>
        <p>{t("safety.urgent.urgentProcess")}</p>
        <p>{t("safety.urgent.designatedOnly")}</p>
      </section>

      <div className="cl-split">
        <div className="cl-main">
          <div className="cl-egrid">
            <SafetyLinkCard
              description={t("safety.cards.reportDescription")}
              href="/safety/report"
              label={t("safety.cards.reportAction")}
              primary
              title={t("safety.cards.reportTitle")}
            />
            <SafetyLinkCard
              description={t("safety.cards.myReportsDescription")}
              href="/safety/my-reports"
              label={t("safety.cards.myReportsAction")}
              title={t("safety.cards.myReportsTitle")}
            />
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

          <Section title={t("safety.confidentiality.title")}>
            <div className="cl-facts">
              {[
                t("safety.confidentiality.identity"),
                t("safety.confidentiality.restricted"),
                t("safety.confidentiality.offline"),
              ].map((text) => (
                <p className="cl-card p-4 text-[13.5px] leading-6 text-[var(--foreground)]" key={text}>
                  {text}
                </p>
              ))}
            </div>
          </Section>
        </div>

        <aside className="cl-side">
          <Widget title={t("safety.next.title")}>
            <ol className="cl-steps">
              {[1, 2, 3].map((step) => (
                <li key={step}>
                  <b>{t(`safety.next.step${step}Title`)}</b>
                  <span>{t(`safety.next.step${step}Text`)}</span>
                </li>
              ))}
            </ol>
          </Widget>
        </aside>
      </div>
    </div>
  );
}

function SafetyLinkCard({
  description,
  href,
  label,
  primary = false,
  title,
}: {
  description: string;
  href: string;
  label: string;
  primary?: boolean;
  title: string;
}) {
  return (
    <section className="cl-card cl-panel min-w-0">
      <h2 className="cl-panel-big">{title}</h2>
      <p className="flex-1 text-[13.5px] text-[var(--muted)]">{description}</p>
      {primary ? (
        <Link className="btn btn-primary min-h-11 w-full sm:w-auto" href={href} prefetch={false}>
          {label}
        </Link>
      ) : (
        <Link className="cl-widget-link" href={href} prefetch={false}>
          {label} →
        </Link>
      )}
    </section>
  );
}
