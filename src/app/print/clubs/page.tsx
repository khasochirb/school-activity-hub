import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDateTime } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { getServerBaseUrl } from "@/lib/server-url";
import { createClient } from "@/lib/supabase/server";
import { ClubPrintSheet } from "./club-print-sheet";

type Profile = {
  school_id: string;
  status: string;
};

type Club = {
  category: string | null;
  id: string;
  name: string;
};

type ClubDetails = {
  beginners_welcome: boolean | null;
  club_id: string;
  cost_notes: string | null;
  first_visit_free: boolean | null;
  meeting_location: string | null;
  meeting_schedule: string | null;
  tagline: string | null;
};

// A one-page club list for homeroom teachers to print or show in class.
// Lives outside the app shell so the menu and tab bar never print.
// Reads run as the signed-in user, under RLS.
export default async function PrintClubsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, status")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || profile.status !== "active") {
    redirect("/dashboard");
  }

  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);

  const [{ data: school }, { data: clubs }, baseUrl] = await Promise.all([
    supabase
      .from("schools")
      .select("name")
      .eq("id", profile.school_id)
      .maybeSingle<{ name: string }>(),
    supabase
      .from("clubs")
      .select("id, name, category")
      .eq("school_id", profile.school_id)
      .eq("status", "active")
      .order("name")
      .returns<Club[]>(),
    getServerBaseUrl(),
  ]);
  const clubRows = clubs ?? [];
  const { data: details } = clubRows.length
    ? await supabase
        .from("club_profiles")
        .select(
          "club_id, tagline, meeting_schedule, meeting_location, cost_notes, beginners_welcome, first_visit_free",
        )
        .in(
          "club_id",
          clubRows.map((club) => club.id),
        )
        .returns<ClubDetails[]>()
    : { data: [] as ClubDetails[] };
  const detailsByClub = new Map(
    (details ?? []).map((row) => [row.club_id, row]),
  );
  const clubsUrl = `${baseUrl}/clubs`;
  const qrSvg = await QRCode.toString(clubsUrl, {
    errorCorrectionLevel: "M",
    margin: 0,
    type: "svg",
  });

  return (
    <ClubPrintSheet
      clubs={clubRows.map((club) => {
        const row = detailsByClub.get(club.id);

        return {
          beginnersWelcome: Boolean(row?.beginners_welcome),
          category: club.category,
          costNotes: row?.cost_notes ?? null,
          firstVisitFree: Boolean(row?.first_visit_free),
          id: club.id,
          meetingLocation: row?.meeting_location ?? null,
          meetingSchedule: row?.meeting_schedule ?? null,
          name: club.name,
          tagline: row?.tagline ?? null,
        };
      })}
      clubsUrl={clubsUrl}
      printedAt={formatDateTime(new Date().toISOString(), locale)}
      qrSvg={qrSvg}
      schoolName={school?.name ?? ""}
      t={t}
      tf={tf}
    />
  );
}
