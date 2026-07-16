import type { EventQuickViewLabels } from "@/components/events/event-quick-view-modal";

type Translate = (key: string) => string;

export function getEventQuickViewLabels(t: Translate): EventQuickViewLabels {
  return {
    attendanceQr: t("events.actions.attendanceQr"),
    cancelRegistration: t("events.actions.cancelMyRegistration"),
    cancelling: t("events.actions.cancelling"),
    capacity: t("events.card.maxParticipants"),
    checkedIn: t("events.registration.checkedIn"),
    close: t("common.close"),
    dateTime: t("events.formGroups.dateTime"),
    description: t("events.form.description"),
    eventQuickView: t("events.quickView.title"),
    hostedBy: t("events.card.hostedBy"),
    joinEvent: t("events.actions.join"),
    joining: t("events.actions.joining"),
    location: t("events.card.location"),
    noDescription: t("events.detail.noDescription"),
    noLimit: t("events.capacity.noLimit"),
    permission: t("events.card.permission"),
    permissionNote: t("events.permission.note"),
    permissionRequired: t("events.permission.required"),
    registration: t("events.card.registration"),
    registrationFull: t("events.quickView.registrationFull"),
    riskLevel: t("events.form.riskLevel"),
    safety: t("events.card.safety"),
    sharedEvent: t("events.sharing.sharedEvent"),
    spacesRemaining: t("events.quickView.spacesRemaining"),
    viewEvent: t("events.quickView.viewEvent"),
    viewFullDetails: t("events.quickView.viewFullDetails"),
  };
}
