import Link from "next/link";
import { ClubAvatar } from "../_components/clean-ui";

export function PortfolioClubs({
  clubs,
  emptyLabel,
  findLabel,
  title,
}: {
  clubs: Array<{ category: string | null; id: string; label: string }>;
  emptyLabel: string;
  findLabel: string;
  title: string;
}) {
  return (
    <section className="portfolio-section">
      <h2>{title}</h2>
      {clubs.length ? (
        <div className="portfolio-clubs">
          {clubs.map((club) => (
            <Link
              className="portfolio-club"
              href={`/clubs/${club.id}`}
              key={club.id}
              prefetch={false}
            >
              <ClubAvatar category={club.category} name={club.label} size={28} />
              {club.label}
            </Link>
          ))}
        </div>
      ) : (
        <p>
          {emptyLabel}{" "}
          <Link className="text-[var(--primary-strong)] underline" href="/clubs" prefetch={false}>
            {findLabel}
          </Link>
        </p>
      )}
    </section>
  );
}
