// Automatic portfolio records: what a student took part in, worked out from
// attendance and club membership, so it is there without the student adding it.

export type ParticipationEvent = {
  category: string | null;
  club_id: string | null;
  ends_at: string;
  id: string;
  school_id: string;
  starts_at: string;
  status: string;
  title: string;
};

export type ClubMembershipPeriod = { club_id: string; joined_at: string };

export type ParticipationRecord = {
  category: string | null;
  clubId: string | null;
  eventId: string;
  /** "attended" was checked in; "club" belongs to the club that held it. */
  source: "attended" | "club";
  schoolId: string;
  startsAt: string;
  title: string;
};

const HELD_STATUSES = ["approved", "completed"];

/**
 * One record per event, newest first. Attendance wins over membership, and a
 * club's event counts only once it is over and only if the student had joined
 * the club before it started.
 */
export function buildParticipationRecords({
  attendedEvents,
  clubEvents,
  memberships,
  now,
}: {
  attendedEvents: ParticipationEvent[];
  clubEvents: ParticipationEvent[];
  memberships: ClubMembershipPeriod[];
  now: Date;
}): ParticipationRecord[] {
  const joinedAt = new Map(
    memberships.map((item) => [item.club_id, Date.parse(item.joined_at)]),
  );
  const records = new Map<string, ParticipationRecord>();

  for (const event of attendedEvents) {
    records.set(event.id, toRecord(event, "attended"));
  }

  for (const event of clubEvents) {
    const joined = event.club_id ? joinedAt.get(event.club_id) : undefined;

    if (
      records.has(event.id) ||
      joined === undefined ||
      !HELD_STATUSES.includes(event.status) ||
      Date.parse(event.ends_at) > now.getTime() ||
      Date.parse(event.starts_at) < joined
    ) {
      continue;
    }

    records.set(event.id, toRecord(event, "club"));
  }

  return [...records.values()].sort(
    (a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt),
  );
}

/** Records without an entry of their own: an entry stands in for its record. */
export function recordsWithoutEntry(
  records: ParticipationRecord[],
  entries: Array<{ event_id: string | null }>,
) {
  const covered = new Set(entries.map((entry) => entry.event_id));

  return records.filter((record) => !covered.has(record.eventId));
}

function toRecord(
  event: ParticipationEvent,
  source: ParticipationRecord["source"],
): ParticipationRecord {
  return {
    category: event.category,
    clubId: event.club_id,
    eventId: event.id,
    schoolId: event.school_id,
    source,
    startsAt: event.starts_at,
    title: event.title,
  };
}
