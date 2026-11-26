export type ClubShareDetails = {
  beginnersWelcome: boolean;
  firstVisitFree: boolean;
  meetingLocation: string | null;
  meetingSchedule: string | null;
  name: string;
};

export type ClubShareLabels = {
  beginnersWelcome: string;
  firstVisitFree: string;
  meetingLocation: string;
  meetingSchedule: string;
};

// The shared message carries the practical facts itself: a friend who is not
// signed in lands on the login page, not on the club.
export function buildClubShareText(
  club: ClubShareDetails,
  labels: ClubShareLabels,
) {
  const flags = [
    club.beginnersWelcome ? labels.beginnersWelcome : null,
    club.firstVisitFree ? labels.firstVisitFree : null,
  ].filter(Boolean);

  return [
    club.name,
    club.meetingSchedule
      ? `${labels.meetingSchedule}: ${club.meetingSchedule}`
      : null,
    club.meetingLocation
      ? `${labels.meetingLocation}: ${club.meetingLocation}`
      : null,
    flags.length ? flags.join(" · ") : null,
  ]
    .filter(Boolean)
    .join("\n");
}
