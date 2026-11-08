export type EventVisibilityProfile = {
  role: "school_admin" | "student" | "teacher";
  school_id: string;
};

export type VisibleEventRecord = {
  school_id: string;
  status: string;
};

export function canViewEvent({
  connectedSchoolIds,
  event,
  profile,
  sharedSchoolIds,
}: {
  connectedSchoolIds: string[];
  event: VisibleEventRecord;
  profile: EventVisibilityProfile;
  sharedSchoolIds: string[];
}) {
  const isStaff = profile.role === "school_admin" || profile.role === "teacher";

  if (event.school_id === profile.school_id) {
    // Completed events stay readable, so attended history and portfolio links
    // keep working. RLS already lets students read them.
    return isStaff || event.status === "approved" || event.status === "completed";
  }

  return (
    event.status === "approved" &&
    sharedSchoolIds.includes(profile.school_id) &&
    connectedSchoolIds.includes(event.school_id)
  );
}
