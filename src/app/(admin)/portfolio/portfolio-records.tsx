import Link from "next/link";
import type { ParticipationRecord } from "@/lib/portfolio/participation";

/** Automatic records. Staff see the same list without the add link. */
export function PortfolioRecords({
  formatDate,
  labels,
  ownSchoolId,
  records,
}: {
  formatDate: (value: string) => string;
  labels: {
    addReflection?: string;
    attended: string;
    club: string;
    description: string;
    title: string;
  };
  /** Set for the student: an entry can only be linked to their own school's event. */
  ownSchoolId?: string;
  records: ParticipationRecord[];
}) {
  if (!records.length) return null;

  return (
    <section className="portfolio-section">
      <h2>{labels.title}</h2>
      <p>{labels.description}</p>
      <ul className="portfolio-records">
        {records.map((record) => (
          <li key={record.eventId}>
            <span className="portfolio-records-text">
              <Link
                className="cl-row-title hover:underline"
                href={`/events/${record.eventId}`}
                prefetch={false}
              >
                {record.title}
              </Link>
              <span className="cl-row-sub">
                {formatDate(record.startsAt)} &middot;{" "}
                {record.source === "attended" ? labels.attended : labels.club}
              </span>
            </span>
            {labels.addReflection && record.schoolId === ownSchoolId ? (
              <Link
                className="btn btn-secondary"
                href={`/portfolio/new?event=${record.eventId}`}
                prefetch={false}
              >
                {labels.addReflection}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
