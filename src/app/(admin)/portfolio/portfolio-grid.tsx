import Link from "next/link";
import type { PortfolioEntry } from "@/lib/portfolio/portfolio";

export type PortfolioGridLabels = {
  add: string;
  addDescription: string;
  draft: string;
  featured: string;
  kinds: Record<PortfolioEntry["kind"], string>;
  photoCount: (count: number) => string;
  visibility: Record<PortfolioEntry["visibility"], string>;
};

export function PortfolioGrid({
  addHref,
  entries,
  formatDate,
  labels,
  showVisibility,
}: {
  addHref?: string;
  entries: PortfolioEntry[];
  formatDate: (value: string) => string;
  labels: PortfolioGridLabels;
  showVisibility: boolean;
}) {
  return (
    <div className="portfolio-grid">
      {addHref ? (
        <Link className="portfolio-card portfolio-card-add" href={addHref}>
          <span className="portfolio-cover">
            <span aria-hidden="true" className="portfolio-plus">
              +
            </span>
          </span>
          <span className="portfolio-card-text">
            <span className="portfolio-card-title">{labels.add}</span>
            <span className="portfolio-card-meta">{labels.addDescription}</span>
          </span>
        </Link>
      ) : null}

      {entries.map((entry) => {
        const photoCount = entry.media_paths.length;

        return (
          <Link
            className={`portfolio-card${entry.is_draft ? " portfolio-card-draft" : ""}`}
            href={`/portfolio/entries/${entry.id}`}
            key={entry.id}
          >
            <span className="portfolio-cover" data-kind={entry.kind}>
              {photoCount ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" loading="lazy" src={`/portfolio/media/${entry.id}/0`} />
              ) : (
                <span className="portfolio-words">
                  <q>{(entry.body || entry.title).slice(0, 220)}</q>
                  <span>{labels.kinds[entry.kind]}</span>
                </span>
              )}
              {entry.is_featured ? (
                <span className="badge portfolio-badge">{labels.featured}</span>
              ) : null}
              {photoCount > 1 ? (
                <span className="portfolio-count">
                  {labels.photoCount(photoCount)}
                </span>
              ) : null}
            </span>
            <span className="portfolio-card-text">
              <span className="portfolio-card-title">{entry.title}</span>
              <span className="portfolio-card-meta">
                {formatDate(entry.entry_date)}
                {showVisibility ? (
                  entry.is_draft ? (
                    <span className="badge">{labels.draft}</span>
                  ) : (
                    <span>&middot; {labels.visibility[entry.visibility]}</span>
                  )
                ) : null}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
