import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SchoolSettingsForm } from "./settings-form";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type School = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  status: string;
};

export default async function SettingsPage() {
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
    .maybeSingle<AdminProfile>();

  if (!profile || profile.role !== "school_admin") {
    redirect("/dashboard");
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id, name, slug, timezone, status")
    .eq("id", profile.school_id)
    .maybeSingle<School>();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Settings</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Manage basic school settings for your activity hub.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">
          School information
        </h2>
        {schoolError ? (
          <p className="mt-2 text-sm text-red-600">
            School information could not be loaded: {schoolError.message}
          </p>
        ) : null}
        {school ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailItem label="School name" value={school.name} />
            <DetailItem label="Slug" value={school.slug} />
            <DetailItem label="Timezone" value={school.timezone} />
            <DetailItem label="Status" value={school.status} />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            No school record was found for your profile.
          </p>
        )}
      </section>

      {school ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">
            Update school settings
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            You can update the school name and timezone. Slug, status, and
            school ownership are managed separately.
          </p>
          <div className="mt-4">
            <SchoolSettingsForm
              name={school.name}
              timezone={school.timezone}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-900">
        {value}
      </dd>
    </div>
  );
}
