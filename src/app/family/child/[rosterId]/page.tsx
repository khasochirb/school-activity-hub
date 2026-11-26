import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getChildPortfolio,
  getFamilyChildren,
  getParentViewer,
  isParentOf,
} from "@/lib/family/family-data";
import { formatDate } from "@/lib/i18n/date-format";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { isUuidValue } from "@/lib/portfolio/portfolio";
import { FamilyHeader } from "../../family-header";

// A read-only view of one child's portfolio for their parent: what the
// child shared with teachers or the school, never private entries or drafts.
export default async function ChildPortfolioPage({
  params,
}: {
  params: Promise<{ rosterId: string }>;
}) {
  const { rosterId } = await params;
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  if (!(await getCurrentUser())) redirect("/login");

  const parent = await getParentViewer();

  if (!parent) redirect("/dashboard");
  if (!isUuidValue(rosterId) || !(await isParentOf(parent.id, rosterId))) notFound();

  const [children, entries] = await Promise.all([getFamilyChildren(parent), getChildPortfolio(rosterId)]);
  const child = children.find((item) => item.rosterId === rosterId);

  if (!child) notFound();

  return (
    <div className="family-page">
      <FamilyHeader name={parent.fullName} />
      <main className="family-main">
        <Link className="cl-back" href="/family">
          ← {t("family.title")}
        </Link>
        <header className="family-child-head">
          <span className="min-w-0">
            <h1>{t("family.portfolio.title")}: {child.displayName}</h1>
            <small>{t("family.portfolio.note")}</small>
          </span>
        </header>
        {entries.length ? (
          entries.map((entry) => (
            <article className="cl-card family-entry" key={entry.id}>
              <small>
                {t(`portfolio.kinds.${entry.kind}`)} · {formatDate(`${entry.entry_date}T12:00:00`, locale)}
              </small>
              <h2>{entry.title}</h2>
              {entry.body ? <p>{entry.body}</p> : null}
              {entry.media_paths.length ? (
                <div className="family-photos">
                  {entry.media_paths.map((_, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      key={index}
                      loading="lazy"
                      src={`/family/media/${entry.id}/${index}`}
                    />
                  ))}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="cl-card cl-empty">
            <b className="block text-[var(--foreground)]">{t("family.portfolio.emptyTitle")}</b>
            <p className="mt-1">{t("family.portfolio.emptyText")}</p>
          </div>
        )}
      </main>
    </div>
  );
}
