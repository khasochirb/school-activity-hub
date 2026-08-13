import { getCurrentClubActor } from "@/lib/auth/club-access";
import {
  CLUB_MEDIA_BUCKET,
  isClubMediaKind,
  isControlledClubMediaPath,
} from "@/lib/clubs/club-media";
import { isUuid } from "@/lib/clubs/club-profile";
import { createClient } from "@/lib/supabase/server";

type ClubMediaProfile = {
  banner_path: string | null;
  logo_path: string | null;
  school_id: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ clubId: string; kind: string }> },
) {
  const { clubId, kind } = await context.params;

  if (!isUuid(clubId) || !isClubMediaKind(kind)) {
    return notFoundResponse();
  }

  const actor = await getCurrentClubActor();

  if (!actor || (!actor.profile && !actor.isPlatformAdmin)) {
    return notFoundResponse();
  }

  const supabase = await createClient();
  const [{ data: canView }, { data: profile }] = await Promise.all([
    supabase.rpc("current_user_can_view_club_profile", {
      target_club_id: clubId,
    }),
    supabase
      .from("club_profiles")
      .select("school_id, logo_path, banner_path")
      .eq("club_id", clubId)
      .maybeSingle<ClubMediaProfile>(),
  ]);

  const path = kind === "logo" ? profile?.logo_path : profile?.banner_path;

  if (
    canView !== true ||
    !profile ||
    !path ||
    !isControlledClubMediaPath(path, profile.school_id, clubId, kind)
  ) {
    return notFoundResponse();
  }

  const { data: image, error } = await supabase.storage
    .from(CLUB_MEDIA_BUCKET)
    .download(path);

  if (error || !image) {
    return notFoundResponse();
  }

  return new Response(await image.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": getContentType(path),
      "X-Content-Type-Options": "nosniff",
    },
    status: 200,
  });
}

function getContentType(path: string) {
  if (path.endsWith(".jpg")) {
    return "image/jpeg";
  }

  if (path.endsWith(".png")) {
    return "image/png";
  }

  return "image/webp";
}

function notFoundResponse() {
  return new Response(null, {
    headers: { "Cache-Control": "private, no-store" },
    status: 404,
  });
}
