import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  formatTranslation,
  getDictionary,
  translate,
} from "@/lib/i18n/dictionary";
import { formatDateTime } from "@/lib/i18n/date-format";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";
import {
  EmptyState,
  HeaderActionLink,
  PageHeader,
  StatusBadge,
} from "../_components/page-ui";
import { archiveAnnouncement } from "./actions";
import { CreateAnnouncementForm } from "./create-announcement-form";

type Profile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};

export default async function AnnouncementsPage() {
  const locale = await getCurrentLocale();
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);
  const tf = (key: string, values: Record<string, string | number>) =>
    formatTranslation(dictionary, key, values);
  const supabase = await createClient();
  const {
    data: { user },
  } = await timeServer("announcements.query.auth-get-user", () =>
    supabase.auth.getUser(),
  );

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await timeServer("announcements.query.profile", () =>
    supabase
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .maybeSingle<Profile>(),
  );

  if (!profile) {
    redirect("/dashboard");
  }

  const isStaff = isSchoolStaff(profile);
  let announcementsQuery = supabase
    .from("announcements")
    .select("id, title, body, status, created_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (!isStaff) {
    announcementsQuery = announcementsQuery.eq("status", "active");
  }

  const { data: announcements, error } = await timeServer(
    "announcements.query.list",
    () => announcementsQuery.returns<Announcement[]>(),
  );

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          isStaff ? (
            <HeaderActionLink href="#create-announcement">
              {t("announcements.actions.create")}
            </HeaderActionLink>
          ) : undefined
        }
        description={t("announcements.description")}
        eyebrow={t("announcements.eyebrow")}
        title={t("announcements.title")}
      />

      {isStaff ? (
        <section
          className="section-card section-card-padded"
          id="create-announcement"
        >
          <h2 className="section-title">
            {t("announcements.create.title")}
          </h2>
          <p className="section-description">
            {t("announcements.create.description")}
          </p>
          <div className="mt-4">
            <CreateAnnouncementForm
              labels={{
                active: t("status.active"),
                archived: t("status.archived"),
                body: t("announcements.form.body"),
                create: t("announcements.actions.create"),
                posting: t("announcements.actions.posting"),
                status: t("announcements.form.status"),
                title: t("announcements.form.title"),
              }}
            />
          </div>
        </section>
      ) : null}

      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">
            {isStaff
              ? t("announcements.list.staffTitle")
              : t("announcements.list.studentTitle")}
          </h2>
          {error ? (
            <p className="mt-2 text-sm text-red-600">
              {tf("announcements.errors.loadFailed", {
                error: error.message,
              })}
            </p>
          ) : null}
        </div>
        {announcements?.length ? (
          <div className="grid gap-4 p-4">
            {announcements.map((announcement) => (
              <article
                className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                key={announcement.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-950">
                      {announcement.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {formatDateTime(announcement.created_at, locale)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={announcement.status}>
                      {statusLabel(announcement.status, t)}
                    </StatusBadge>
                    {isStaff ? (
                      <ArchiveForm
                        announcement={announcement}
                        labels={{
                          archive: t("announcements.actions.archive"),
                          archiving: t("announcements.actions.archiving"),
                        }}
                      />
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-zinc-700">
                  {announcement.body}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-4">
            <EmptyState
              action={
                isStaff ? (
                  <HeaderActionLink href="#create-announcement">
                    {t("announcements.actions.create")}
                  </HeaderActionLink>
                ) : undefined
              }
              description={
                isStaff
                  ? t("announcements.empty.staffDescription")
                  : t("announcements.empty.studentDescription")
              }
              title={t("announcements.empty.title")}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function ArchiveForm({
  announcement,
  labels,
}: {
  announcement: Announcement;
  labels: {
    archive: string;
    archiving: string;
  };
}) {
  if (announcement.status !== "active") {
    return null;
  }

  return (
    <form action={archiveAnnouncement}>
      <input name="announcement_id" type="hidden" value={announcement.id} />
      <PendingSubmitButton
        className="btn btn-secondary min-h-9 px-3"
        pendingLabel={labels.archiving}
      >
        {labels.archive}
      </PendingSubmitButton>
    </form>
  );
}

function isSchoolStaff(profile: Profile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}

function statusLabel(status: string, t: (key: string) => string) {
  if (status === "active") {
    return t("status.active");
  }

  if (status === "archived") {
    return t("status.archived");
  }

  return status;
}
