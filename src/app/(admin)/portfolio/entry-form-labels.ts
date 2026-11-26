import type { EntryFormLabels } from "./entry-form";

const ERROR_CODES = [
  "animated",
  "denied",
  "dimensions",
  "invalid",
  "invalidImage",
  "invalidType",
  "mimeMismatch",
  "saveFailed",
  "tooLarge",
  "tooManyPhotos",
  "uploadFailed",
] as const;

export function portfolioErrorLabels(t: (key: string) => string) {
  return Object.fromEntries(
    ERROR_CODES.map((code) => [code, t(`portfolio.errors.${code}`)]),
  ) as Record<string, string>;
}

export function buildEntryFormLabels(
  t: (key: string) => string,
  mode: "create" | "edit",
): EntryFormLabels {
  return {
    body: t("portfolio.form.body"),
    bodyPlaceholder: t("portfolio.form.bodyPlaceholder"),
    cancel: t("portfolio.form.cancel"),
    charactersLeft: t("portfolio.form.charactersLeft"),
    club: t("portfolio.form.club"),
    date: t("portfolio.form.date"),
    draft: t("portfolio.form.draft"),
    errors: portfolioErrorLabels(t),
    event: t("portfolio.form.event"),
    kind: t("portfolio.form.kind"),
    kinds: {
      achievement: t("portfolio.kinds.achievement"),
      photos: t("portfolio.kinds.photos"),
      project: t("portfolio.kinds.project"),
      reflection: t("portfolio.kinds.reflection"),
    },
    noClub: t("portfolio.form.noClub"),
    noEvent: t("portfolio.form.noEvent"),
    photosAfterSave: t("portfolio.form.photosAfterSave"),
    prompts: t("portfolio.form.prompts"),
    saved: t("portfolio.toasts.saved"),
    saving: t("portfolio.form.saving"),
    submit: mode === "create" ? t("portfolio.form.create") : t("portfolio.form.save"),
    title: t("portfolio.form.title"),
    titlePlaceholder: t("portfolio.form.titlePlaceholder"),
    visibility: t("portfolio.visibility.label"),
    visibilityHelp: {
      private: t("portfolio.visibility.privateHelp"),
      school: t("portfolio.visibility.schoolHelp"),
      staff: t("portfolio.visibility.staffHelp"),
    },
    visibilityOptions: {
      private: t("portfolio.visibility.private"),
      school: t("portfolio.visibility.school"),
      staff: t("portfolio.visibility.staff"),
    },
  };
}
