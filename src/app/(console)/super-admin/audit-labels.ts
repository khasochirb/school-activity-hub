const actionLabelKeyByAction: Record<string, string> = {
  "platform.club.archived": "superAdmin.auditLog.actionLabels.clubArchived",
  "platform.club.created": "superAdmin.auditLog.actionLabels.clubCreated",
  "platform.club.restored": "superAdmin.auditLog.actionLabels.clubRestored",
  "platform.connection.approved":
    "superAdmin.auditLog.actionLabels.connectionApproved",
  "platform.connection.created":
    "superAdmin.auditLog.actionLabels.connectionCreated",
  "platform.connection.rejected":
    "superAdmin.auditLog.actionLabels.connectionRejected",
  "platform.connection.revoked":
    "superAdmin.auditLog.actionLabels.connectionRevoked",
  "platform.platform_admin.added":
    "superAdmin.auditLog.actionLabels.platformAdminAdded",
  "platform.platform_admin.deactivated":
    "superAdmin.auditLog.actionLabels.platformAdminDeactivated",
  "platform.platform_admin.reactivated":
    "superAdmin.auditLog.actionLabels.platformAdminReactivated",
  "platform.school.created": "superAdmin.auditLog.actionLabels.schoolCreated",
  "platform.school.updated": "superAdmin.auditLog.actionLabels.schoolUpdated",
  "platform.school_admin.created":
    "superAdmin.auditLog.actionLabels.schoolAdminCreated",
  "platform.school_admin.deactivated":
    "superAdmin.auditLog.actionLabels.schoolAdminDeactivated",
  "platform.school_admin.reactivated":
    "superAdmin.auditLog.actionLabels.schoolAdminReactivated",
  "platform.teacher.created": "superAdmin.auditLog.actionLabels.teacherCreated",
  "platform.teacher.deactivated": "superAdmin.auditLog.actionLabels.teacherDeactivated",
  "platform.teacher.reactivated": "superAdmin.auditLog.actionLabels.teacherReactivated",
};

// An action with no label yet shows as its own name.
export function auditActionLabelKey(action: string) {
  return actionLabelKeyByAction[action] ?? action;
}
