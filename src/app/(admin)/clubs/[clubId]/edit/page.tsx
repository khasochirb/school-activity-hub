import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { getCurrentClubActor } from "@/lib/auth/club-access";
import {
  EMPTY_CLUB_PROFILE_VALUES,
  type ClubProfileTheme,
  type ClubProfileValues,
  isUuid,
} from "@/lib/clubs/club-profile";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { ClubMediaManager } from "./club-media-manager";
import { ClubProfileForm } from "./club-profile-form";

type Club = {
  id: string;
  name: string;
  school_id: string;
};

type ClubProfileRow = {
  about: string | null;
  accessibility_notes: string | null;
  commitment_notes: string | null;
  cost_notes: string | null;
  eligibility_notes: string | null;
  banner_path: string | null;
  logo_path: string | null;
  materials_notes: string | null;
  meeting_location: string | null;
  meeting_schedule: string | null;
  tagline: string | null;
  theme_key: ClubProfileTheme | null;
  updated_at: string;
};

export default async function EditClubProfilePage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;

  if (!isUuid(clubId)) {
    notFound();
  }

  const actor = await getCurrentClubActor();

  if (!actor) {
    redirect("/login");
  }

  if (!actor.profile && !actor.isPlatformAdmin) {
    redirect("/dashboard");
  }

  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const supabase = await createClient();
  const [{ data: club }, { data: canEdit }] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, school_id, name")
      .eq("id", clubId)
      .maybeSingle<Club>(),
    supabase.rpc("current_user_can_edit_club_profile", {
      target_club_id: clubId,
    }),
  ]);

  if (!club || canEdit !== true) {
    notFound();
  }

  const { data: clubProfile } = await supabase
    .from("club_profiles")
    .select(
      "tagline, about, meeting_schedule, meeting_location, eligibility_notes, commitment_notes, accessibility_notes, cost_notes, materials_notes, theme_key, logo_path, banner_path, updated_at",
    )
    .eq("club_id", club.id)
    .maybeSingle<ClubProfileRow>();
  const initialValues = toFormValues(clubProfile);

  return (
    <div className="page-stack">
      <section className="page-header">
        <Link
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary-strong)]"
          href={`/clubs/${club.id}`}
          prefetch={false}
        >
          {t("clubs.profile.actions.backToClub")}
          <PendingLinkIndicator />
        </Link>
        <p className="page-eyebrow">{t("clubs.profile.clubPage")}</p>
        <h1 className="page-title break-words">
          {t("clubs.profile.actions.edit")}: {club.name}
        </h1>
        <p className="page-description">
          {t("clubs.profile.editDescription")}
        </p>
      </section>

      <ClubMediaManager
        bannerUrl={getMediaUrl(club.id, "banner", clubProfile)}
        clubId={club.id}
        clubName={club.name}
        labels={{
          banner: t("clubs.profile.media.banner"),
          bannerAlt: tf("clubs.profile.media.bannerAlt", { club: club.name }),
          bannerRequirements: t("clubs.profile.media.bannerRequirements"),
          cancel: t("common.cancel"),
          confirmDescription: t("clubs.profile.media.confirmDescription"),
          confirmRemove: t("clubs.profile.media.confirmRemove"),
          description: t("clubs.profile.media.description"),
          errors: {
            animated: t("clubs.profile.media.errors.animated"),
            dimensions: t("clubs.profile.media.errors.dimensions"),
            editDenied: t("clubs.profile.errors.editDenied"),
            invalidImage: t("clubs.profile.media.errors.invalidImage"),
            invalidType: t("clubs.profile.media.errors.invalidType"),
            mimeMismatch: t("clubs.profile.media.errors.mimeMismatch"),
            notFound: t("clubs.profile.errors.notFound"),
            removeFailed: t("clubs.profile.media.errors.removeFailed"),
            saveFailed: t("clubs.profile.media.errors.saveFailed"),
            tooLarge: t("clubs.profile.media.errors.tooLarge"),
            uploadFailed: t("clubs.profile.media.errors.uploadFailed"),
          },
          guidance: t("clubs.profile.media.guidance"),
          logo: t("clubs.profile.media.logo"),
          logoAlt: tf("clubs.profile.media.logoAlt", { club: club.name }),
          logoRequirements: t("clubs.profile.media.logoRequirements"),
          ratioWarning: t("clubs.profile.media.ratioWarning"),
          remove: t("clubs.profile.media.actions.remove"),
          removed: t("clubs.profile.media.success.removed"),
          removing: t("clubs.profile.media.actions.removing"),
          replace: t("clubs.profile.media.actions.replace"),
          title: t("clubs.profile.media.title"),
          upload: t("clubs.profile.media.actions.upload"),
          uploaded: t("clubs.profile.media.success.uploaded"),
          uploading: t("clubs.profile.media.actions.uploading"),
        }}
        logoUrl={getMediaUrl(club.id, "logo", clubProfile)}
        themeClass={getThemeClass(clubProfile?.theme_key ?? "warm")}
      />

      <section className="section-card section-card-padded max-w-5xl">
        <ClubProfileForm
          clubId={club.id}
          initialValues={initialValues}
          labels={{
            cancel: t("common.cancel"),
            characterCount: t("clubs.profile.form.charactersRemaining"),
            fields: {
              about: t("clubs.profile.fields.about"),
              accessibilityNotes: t(
                "clubs.profile.fields.accessibilityNotes",
              ),
              commitmentNotes: t("clubs.profile.fields.commitmentNotes"),
              costNotes: t("clubs.profile.fields.costNotes"),
              eligibilityNotes: t("clubs.profile.fields.eligibilityNotes"),
              materialsNotes: t("clubs.profile.fields.materialsNotes"),
              meetingLocation: t("clubs.profile.fields.meetingLocation"),
              meetingSchedule: t("clubs.profile.fields.meetingSchedule"),
              tagline: t("clubs.profile.fields.tagline"),
              themeKey: t("clubs.profile.fields.themeKey"),
            },
            save: t("clubs.profile.actions.save"),
            saving: t("clubs.profile.actions.saving"),
            themeDescription: t("clubs.profile.form.themeDescription"),
            themes: {
              forest: t("clubs.profile.themes.forest"),
              plum: t("clubs.profile.themes.plum"),
              sky: t("clubs.profile.themes.sky"),
              warm: t("clubs.profile.themes.warm"),
            },
          }}
        />
      </section>
    </div>
  );
}

function getMediaUrl(
  clubId: string,
  kind: "banner" | "logo",
  profile: ClubProfileRow | null,
) {
  const path = kind === "logo" ? profile?.logo_path : profile?.banner_path;

  return path
    ? `/clubs/${clubId}/media/${kind}?v=${encodeURIComponent(profile?.updated_at ?? "")}`
    : null;
}

function getThemeClass(theme: ClubProfileTheme) {
  const themes: Record<ClubProfileTheme, string> = {
    forest: "bg-[linear-gradient(135deg,var(--card),var(--card-soft))]",
    plum: "bg-[linear-gradient(135deg,var(--card),var(--card-soft))]",
    sky: "bg-[linear-gradient(135deg,var(--card),var(--card-soft))]",
    warm: "bg-[linear-gradient(135deg,var(--card),var(--primary-soft))]",
  };

  return themes[theme];
}

function toFormValues(profile: ClubProfileRow | null): ClubProfileValues {
  if (!profile) {
    return EMPTY_CLUB_PROFILE_VALUES;
  }

  return {
    about: profile.about ?? "",
    accessibilityNotes: profile.accessibility_notes ?? "",
    commitmentNotes: profile.commitment_notes ?? "",
    costNotes: profile.cost_notes ?? "",
    eligibilityNotes: profile.eligibility_notes ?? "",
    materialsNotes: profile.materials_notes ?? "",
    meetingLocation: profile.meeting_location ?? "",
    meetingSchedule: profile.meeting_schedule ?? "",
    tagline: profile.tagline ?? "",
    themeKey: profile.theme_key ?? "warm",
  };
}
