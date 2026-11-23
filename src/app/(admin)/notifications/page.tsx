import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/i18n/date-format";
import { formatTranslation, getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "../_components/clean-ui";
import { markAllNotificationsRead } from "./actions";

type NotificationRow = {
  created_at: string;
  data: Record<string, string | number> | null;
  id: string;
  kind: string;
  read_at: string | null;
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, data, read_at, created_at")
    .eq("recipient_profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60)
    .returns<NotificationRow[]>();
  const notes = data ?? [];
  const unread = notes.filter((note) => !note.read_at).length;

  return (
    <div className="cl-page">
      <PageHead
        action={
          unread ? (
            <form action={markAllNotificationsRead}>
              <button className="btn btn-secondary" type="submit">
                {t("notifications.markAllRead")}
              </button>
            </form>
          ) : null
        }
        subtitle={t("notifications.subtitle")}
        title={t("notifications.title")}
      />
      {error ? (
        <p className="card p-4 text-sm text-[var(--muted)]">{t("notifications.unavailable")}</p>
      ) : notes.length ? (
        <div className="card cl-notes">
          {notes.map((note) => (
            <Link
              className="cl-note"
              data-unread={note.read_at ? undefined : ""}
              href={`/notifications/open/${note.id}`}
              key={note.id}
              prefetch={false}
            >
              <span aria-hidden="true" className="cl-note-dot" />
              <span className="min-w-0">
                <span className="cl-note-text">{noteText(note, dictionary, t)}</span>
                <span className="cl-note-time">{formatDateTime(note.created_at, locale)}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="card p-6 text-center text-[var(--muted)]">{t("notifications.empty")}</p>
      )}
    </div>
  );
}

function noteText(
  note: NotificationRow,
  dictionary: ReturnType<typeof getDictionary>,
  t: (key: string) => string,
) {
  const key = `notifications.kinds.${note.kind}`;
  const template = t(key);

  if (template === key) return t("notifications.generic");

  const values = Object.fromEntries(
    Object.entries(note.data ?? {}).map(([name, value]) => [name, String(value)]),
  );

  return formatTranslation(dictionary, key, values);
}
