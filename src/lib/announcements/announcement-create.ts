export const ANNOUNCEMENT_STATUSES = ["active", "archived"] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export type AnnouncementCreationProfile = {
  role: "school_admin" | "student" | "teacher";
  school_id: string;
  status: "active" | "inactive";
};

export type AnnouncementFormValues = {
  body: string;
  status: string;
  title: string;
};

export type AnnouncementValidationErrors = Partial<
  Record<keyof AnnouncementFormValues, "bodyRequired" | "invalidStatus" | "titleRequired">
>;

export function normalizeAnnouncementValues(input: {
  body: FormDataEntryValue | null;
  status: FormDataEntryValue | null;
  title: FormDataEntryValue | null;
}): AnnouncementFormValues {
  return {
    body: String(input.body ?? "").trim(),
    status: String(input.status ?? "active").trim(),
    title: String(input.title ?? "").trim(),
  };
}

export function validateAnnouncementValues(
  values: AnnouncementFormValues,
): AnnouncementValidationErrors {
  const errors: AnnouncementValidationErrors = {};

  if (!values.title) {
    errors.title = "titleRequired";
  }

  if (!values.body) {
    errors.body = "bodyRequired";
  }

  if (!ANNOUNCEMENT_STATUSES.some((status) => status === values.status)) {
    errors.status = "invalidStatus";
  }

  return errors;
}

export function canCreateAnnouncementForSchool(
  profile: AnnouncementCreationProfile | null,
  schoolId: string,
) {
  return Boolean(
    profile &&
      profile.status === "active" &&
      profile.school_id === schoolId &&
      (profile.role === "school_admin" || profile.role === "teacher"),
  );
}
