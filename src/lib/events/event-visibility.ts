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
    return isStaff || event.status === "approved";
  }

  return (
    event.status === "approved" &&
    sharedSchoolIds.includes(profile.school_id) &&
    connectedSchoolIds.includes(event.school_id)
  );
}
