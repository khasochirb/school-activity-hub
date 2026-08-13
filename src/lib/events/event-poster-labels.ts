import type { EventPosterLabels } from "@/components/events/event-poster-uploader";

type Translate = (key: string) => string;

export function getEventPosterLabels(t: Translate): EventPosterLabels {
  return {
    alt: t("events.poster.alt"),
    cancel: t("common.cancel"),
    confirmDescription: t("events.poster.confirmDescription"),
    confirmRemove: t("events.poster.confirmRemove"),
    createdWithoutPoster: t("events.poster.createdWithoutPoster"),
    description: t("events.poster.description"),
    errors: {
      animated: t("events.poster.errors.animated"),
      dimensions: t("events.poster.errors.dimensions"),
      editDenied: t("events.poster.errors.editDenied"),
      invalidImage: t("events.poster.errors.invalidImage"),
      invalidType: t("events.poster.errors.invalidType"),
      mimeMismatch: t("events.poster.errors.mimeMismatch"),
      notFound: t("events.poster.errors.notFound"),
      removeFailed: t("events.poster.errors.removeFailed"),
      saveFailed: t("events.poster.errors.saveFailed"),
      tooLarge: t("events.poster.errors.tooLarge"),
      uploadFailed: t("events.poster.errors.uploadFailed"),
    },
    guidance: t("events.poster.guidance"),
    noPoster: t("events.poster.noPoster"),
    openEvent: t("events.poster.openEvent"),
    remove: t("events.poster.remove"),
    removed: t("events.poster.removed"),
    removing: t("events.poster.removing"),
    replace: t("events.poster.replace"),
    requirements: t("events.poster.requirements"),
    retry: t("events.poster.retry"),
    selected: t("events.poster.selected"),
    title: t("events.poster.title"),
    upload: t("events.poster.upload"),
    uploaded: t("events.poster.uploaded"),
    uploading: t("events.poster.uploading"),
  };
}
