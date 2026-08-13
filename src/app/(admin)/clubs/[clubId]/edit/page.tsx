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
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
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
  materials_notes: string | null;
  meeting_location: string | null;
  meeting_schedule: string | null;
  tagline: string | null;
  theme_key: ClubProfileTheme | null;
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
      "tagline, about, meeting_schedule, meeting_location, eligibility_notes, commitment_notes, accessibility_notes, cost_notes, materials_notes, theme_key",
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

