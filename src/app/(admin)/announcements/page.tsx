import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  audience: string;
  status: string;
  created_at: string;
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) {
    redirect("/dashboard");
  }

  const isStaff = isSchoolStaff(profile);
  let announcementsQuery = supabase
    .from("announcements")
    .select("id, title, body, audience, status, created_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  if (!isStaff) {
    announcementsQuery = announcementsQuery
      .eq("status", "active")
      .eq("audience", "all_students");
  }

  const { data: announcements, error } =
    await announcementsQuery.returns<Announcement[]>();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">
          Announcements
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          School notices for students and staff.
        </p>
      </section>

      {isStaff ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            Create announcement
          </h2>
          <div className="mt-4">
            <CreateAnnouncementForm />
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            {isStaff ? "School notices" : "Active notices"}
          </h2>
          {error ? (
            <p className="mt-2 text-sm text-red-600">
              Announcements could not be loaded: {error.message}
            </p>
          ) : null}
        </div>
        {announcements?.length ? (
          <div className="grid gap-4 p-4">
            {announcements.map((announcement) => (
              <article
                className="rounded-lg border border-zinc-200 p-4"
                key={announcement.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-950">
                      {announcement.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {formatDateTime(announcement.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AudienceBadge audience={announcement.audience} />
                    <StatusBadge status={announcement.status} />
                    {isStaff ? (
                      <ArchiveForm announcement={announcement} />
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
          <p className="p-6 text-sm text-zinc-600">
            No announcements to show.
          </p>
        )}
      </section>
    </div>
  );
}

function ArchiveForm({ announcement }: { announcement: Announcement }) {
  if (announcement.status !== "active") {
    return null;
  }

  return (
    <form action={archiveAnnouncement}>
      <input name="announcement_id" type="hidden" value={announcement.id} />
      <button
        className="h-9 cursor-pointer rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        type="submit"
      >
        Archive
      </button>
    </form>
  );
}

function AudienceBadge({ audience }: { audience: string }) {
  return (
    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
      {formatAudience(audience)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-zinc-100 text-zinc-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

function isSchoolStaff(profile: Profile) {
  return profile.role === "school_admin" || profile.role === "teacher";
}

function formatAudience(audience: string) {
  return audience
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
