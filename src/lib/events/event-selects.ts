const EVENT_QUICK_VIEW_COLUMNS = [
  "id",
  "school_id",
  "club_id",
  "created_by_profile_id",
  "title",
  "description",
  "category",
  "location",
  "starts_at",
  "ends_at",
  "capacity",
  "status",
  "allow_connected_school_registration",
  "risk_level",
  "permission_required",
  "permission_note",
  "responsible_staff_id",
  "eligibility_notes",
  "experience_level",
  "accessibility_notes",
  "cost_type",
  "cost_amount",
  "cost_currency",
  "cost_notes",
  "required_materials",
  "expected_commitment",
  "cancellation_notice",
] as const;

export const EVENT_QUICK_VIEW_SELECT = EVENT_QUICK_VIEW_COLUMNS.join(", ");

export const EVENT_DETAIL_SELECT = [
  ...EVENT_QUICK_VIEW_COLUMNS,
  "submitted_at",
  "approved_at",
  "rejection_reason",
  "created_at",
  "updated_at",
].join(", ");

export const EVENT_APPROVAL_SELECT = [
  ...EVENT_QUICK_VIEW_COLUMNS.filter(
    (column) =>
      column !== "created_by_profile_id" &&
      column !== "allow_connected_school_registration" &&
      column !== "status",
  ),
  "submitted_at",
  "created_at",
].join(", ");

export const EVENT_ATTENDANCE_SELECT = [
  "id",
  "school_id",
  "title",
  "location",
  "starts_at",
  "ends_at",
  "risk_level",
  "permission_required",
  "permission_note",
  "cancellation_notice",
  "status",
].join(", ");

export const EVENT_CALENDAR_EXPORT_SELECT = [
  "id",
  "school_id",
  "title",
  "description",
  "cancellation_notice",
  "location",
  "starts_at",
  "ends_at",
  "status",
  "created_at",
].join(", ");

export const EVENT_CREATE_RESULT_SELECT = "id, school_id, cancellation_notice";

// Events has four profile relationships. Any PostgREST embed must name the FK.
export const EVENT_CREATOR_PROFILE_RELATION =
  "creator:profiles!events_created_by_profile_id_fkey(id, full_name)";
export const EVENT_RESPONSIBLE_STAFF_PROFILE_RELATION =
  "responsible_staff:profiles!events_responsible_staff_school_fk(id, full_name, role, status)";

export const EVENT_PROFILE_RELATION_SELECT = [
  "id",
  EVENT_CREATOR_PROFILE_RELATION,
  EVENT_RESPONSIBLE_STAFF_PROFILE_RELATION,
].join(", ");
