import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getFamilyChildren, getParentViewer } from "@/lib/family/family-data";
import { formatDate, formatTime } from "@/lib/i18n/date-format";
import { formatTranslation, getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { logout } from "../(admin)/actions";
import { AddChildForm } from "./add-child-form";

// The parent's home: each linked child's clubs, upcoming activities (with
// whether a permission slip is needed) and recent attendance. Nothing about
// any other student.
export default async function FamilyPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  if (!(await getCurrentUser())) redirect("/login");

  const parent = await getParentViewer();

  if (!parent) redirect("/dashboard");

  const children = await getFamilyChildren(parent);

  return (
    <div className="family-page">
      <header className="family-top">
        <span className="family-brand">
          <BrandMark className="h-9 w-9" />
          <span>
            <b>{t("family.title")}</b>
            <small>{parent.fullName}</small>
          </span>
        </span>
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

      <main className="family-main">
        {children.length ? null : (
          <div className="cl-card cl-empty">
            <b className="block text-[var(--foreground)]">{t("family.empty.title")}</b>
            <p className="mt-1">{t("family.empty.text")}</p>
          </div>
        )}

        {children.map((child) => (
          <section className="cl-card family-child" key={child.rosterId}>
            <header className="family-child-head">
              <span aria-hidden="true" className="founder-avatar">
                {initials(child.displayName)}
              </span>
              <span className="min-w-0">
                <h1>{child.displayName}</h1>
                <small>
                  {[child.schoolName, child.homeroom ?? child.gradeLevel].filter(Boolean).join(" · ")}
                </small>
              </span>
            </header>

            <div className="family-block">
              <h2>{t("family.clubs.title")}</h2>
              {child.clubs.length ? (
                <ul className="family-tags">
                  {child.clubs.map((club) => (
                    <li key={club.id}>
                      {club.name}
                      {club.role === "leader" ? <span className="cl-tag" data-tone="ok">{t("clubs.memberRoles.leader")}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="family-muted">{t("family.clubs.empty")}</p>
              )}
            </div>

            <div className="family-block">
              <h2>{t("family.upcoming.title")}</h2>
              {child.upcoming.length ? (
                <ul className="family-list">
                  {child.upcoming.map((event) => (
                    <li key={event.id}>
                      <span className="min-w-0">
                        <b>{event.title}</b>
                        <small>
                          {formatDate(event.startsAt, locale)} · {formatTime(event.startsAt, locale)}
                          {event.location ? ` · ${event.location}` : ""}
                        </small>
                      </span>
                      {event.permissionStatus !== "not_required" ? (
                        <span
                          className="cl-tag"
                          data-tone={event.permissionStatus === "received" ? "ok" : "warn"}
                        >
                          {t(`family.permission.${event.permissionStatus}`)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="family-muted">{t("family.upcoming.empty")}</p>
              )}
            </div>

            <div className="family-block">
              <h2>{t("family.recent.title")}</h2>
              {child.recent.length ? (
                <ul className="family-list">
                  {child.recent.map((event) => (
                    <li key={event.id}>
                      <span className="min-w-0">
                        <b>{event.title}</b>
                        <small>{formatDate(event.startsAt, locale)}</small>
                      </span>
                      <span className="cl-tag" data-tone="ok">{t("family.recent.attended")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="family-muted">{t("family.recent.empty")}</p>
              )}
            </div>
          </section>
        ))}

        <section className="cl-card family-child">
          <div className="family-block">
            <h2>{t("family.add.title")}</h2>
            <p className="family-muted">{t("family.add.text")}</p>
            <AddChildForm
              labels={{
                code: t("family.add.code"),
                placeholder: t("auth.join.inviteCodePlaceholder"),
                submit: t("family.add.submit"),
                submitting: t("family.add.submitting"),
              }}
            />
          </div>
        </section>

        <p className="family-muted family-foot">{tf("family.foot", { count: children.length })}</p>
      </main>
    </div>
  );
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}
