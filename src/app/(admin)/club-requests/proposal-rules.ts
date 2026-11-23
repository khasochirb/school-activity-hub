// Rules for club proposals, kept free of imports so tests load them as is.

// The proposer plus at least four classmates.
export const FOUNDERS_REQUIRED = 5;
export const MAX_FOUNDERS = 10;
export const MAX_OPEN_PROPOSALS = 3;

export type FounderStatus = "confirmed" | "declined" | "invited";

// Ready for the school admin when nobody is still deciding and enough said yes.
export function canSubmitProposal(statuses: FounderStatus[]) {
  const confirmed = statuses.filter((status) => status === "confirmed").length;
  const waiting = statuses.filter((status) => status === "invited").length;

  return waiting === 0 && confirmed >= FOUNDERS_REQUIRED;
}

// "Болд Б." — given (or preferred) name and family-name initial, as the picker shows.
export function founderDisplayName(student: {
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
}) {
  const given = (student.preferred_name ?? "").trim() || student.first_name.trim();
  const initial = student.last_name.trim().slice(0, 1).toUpperCase();

  return initial ? `${given} ${initial}.` : given;
}
