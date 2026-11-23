import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { safeLink } from "@/lib/notifications/notify";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Opening a notification marks it read, then goes where it points. Only the
// recipient can do either (row security), and only to a path on this site.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const fallback = new URL("/notifications", request.url);
  const user = await getCurrentUser();

  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!UUID.test(id)) return NextResponse.redirect(fallback);

  const supabase = await createClient();
  const { data: note } = await supabase
    .from("notifications")
    .select("id, link, read_at")
    .eq("id", id)
    .eq("recipient_profile_id", user.id)
    .maybeSingle<{ id: string; link: string | null; read_at: string | null }>();

  if (!note) return NextResponse.redirect(fallback);

  if (!note.read_at) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", note.id)
      .eq("recipient_profile_id", user.id);
  }

  const link = safeLink(note.link);

  return NextResponse.redirect(new URL(link ?? "/notifications", request.url));
}
