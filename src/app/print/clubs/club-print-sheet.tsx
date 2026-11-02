import { getActivityCategoryTranslationKey } from "@/lib/activity-categories";
import { PrintButton } from "./print-button";

export type PrintClub = {
  beginnersWelcome: boolean;
  category: string | null;
  costNotes: string | null;
  firstVisitFree: boolean;
  id: string;
  meetingLocation: string | null;
  meetingSchedule: string | null;
  name: string;
  tagline: string | null;
};

// Fixed hex colours on purpose: the app remaps slate/white classes in dark
// mode, and paper must always get dark ink on white.
export function ClubPrintSheet({
  clubs,
  clubsUrl,
  printedAt,
  qrSvg,
  schoolName,
  t,
  tf,
}: {
  clubs: PrintClub[];
  clubsUrl: string;
  printedAt: string;
  qrSvg: string;
  schoolName: string;
  t: (key: string) => string;
  tf: (key: string, values: Record<string, string | number>) => string;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-[210mm] bg-[#ffffff] p-6 text-[#0f172a] print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton label={t("clubs.print.printButton")} />
      </div>

      <header className="flex items-start justify-between gap-6 border-b-2 border-[#0f172a] pb-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#475569]">
            {t("app.name")}
          </p>
          <h1 className="mt-1 text-3xl font-black leading-tight">
            {tf("clubs.print.title", { school: schoolName })}
          </h1>
          <p className="mt-2 text-base text-[#334155]">{t("clubs.print.scanHint")}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div
            aria-label={t("clubs.print.qrLabel")}
            className="h-32 w-32 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
            role="img"
          />
          <p className="max-w-32 break-all text-center text-[0.65rem] text-[#475569]">
            {clubsUrl.replace(/^https?:\/\//, "")}
          </p>
        </div>
      </header>

      {clubs.length ? (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {clubs.map((club) => {
            const facts = [
              [t("studentProfile.clubFacts.when"), club.meetingSchedule],
              [t("studentProfile.clubFacts.where"), club.meetingLocation],
              [t("studentProfile.clubFacts.cost"), club.costNotes],
            ].filter((fact): fact is [string, string] => Boolean(fact[1]));
            const flags = [
              club.beginnersWelcome ? t("clubs.profile.fields.beginnersWelcome") : null,
              club.firstVisitFree ? t("clubs.profile.fields.firstVisitFree") : null,
            ].filter((flag): flag is string => Boolean(flag));

            return (
              <li
                className="break-inside-avoid rounded-lg border border-[#cbd5e1] p-3"
                key={club.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 break-words text-lg font-bold leading-snug">
                    {club.name}
                  </h2>
                  {club.category ? (
                    <span className="shrink-0 rounded-full border border-[#94a3b8] px-2 py-0.5 text-xs font-semibold text-[#334155]">
                      {categoryLabel(club.category, t)}
                    </span>
                  ) : null}
                </div>
                {club.tagline ? (
                  <p className="mt-1 text-sm text-[#334155]">{club.tagline}</p>
                ) : null}
                {facts.length ? (
                  <dl className="mt-2 grid gap-0.5 text-sm">
                    {facts.map(([label, value]) => (
                      <div className="flex gap-2" key={label}>
                        <dt className="shrink-0 font-semibold">{label}</dt>
                        <dd className="min-w-0 break-words text-[#334155]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {flags.length ? (
                  <p className="mt-2 text-sm font-semibold">✓ {flags.join(" · ")}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-base text-[#334155]">{t("clubs.print.empty")}</p>
      )}

      <footer className="mt-5 border-t border-[#cbd5e1] pt-3 text-xs text-[#475569]">
        {tf("clubs.print.footer", { count: clubs.length, date: printedAt })}
      </footer>
    </main>
  );
}

function categoryLabel(category: string, t: (key: string) => string) {
  const key = getActivityCategoryTranslationKey(category);

  return key ? t(key) : category;
}
