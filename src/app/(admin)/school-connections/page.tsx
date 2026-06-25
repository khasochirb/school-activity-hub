import { redirect } from "next/navigation";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { createClient } from "@/lib/supabase/server";
import {
  requestSchoolConnection,
  respondToSchoolConnection,
} from "./actions";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type School = {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  status: string;
};

type ConnectionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "blocked"
  | "archived";

type SchoolConnection = {
  id: string;
  requester_school_id: string;
  receiver_school_id: string;
  status: ConnectionStatus;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
};

type SearchParams = {
  error?: string | string[];
  success?: string | string[];
};

export default async function SchoolConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
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

  const [
    { data: currentSchool },
    { data: activeSchools, error: schoolsError },
    { data: connections, error: connectionsError },
  ] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, slug, province, status")
      .eq("id", profile.school_id)
      .maybeSingle<School>(),
    supabase
      .from("schools")
      .select("id, name, slug, province, status")
      .eq("status", "active")
      .order("name", { ascending: true })
      .returns<School[]>(),
    supabase
      .from("school_connections")
      .select(
        "id, requester_school_id, receiver_school_id, status, requested_at, responded_at, created_at",
      )
      .or(
        `requester_school_id.eq.${profile.school_id},receiver_school_id.eq.${profile.school_id}`,
      )
      .order("created_at", { ascending: false })
      .returns<SchoolConnection[]>(),
  ]);

  const otherSchools = (activeSchools ?? []).filter(
    (school) => school.id !== profile.school_id,
  );
  const schoolsById = new Map<string, School>();

  for (const school of activeSchools ?? []) {
    schoolsById.set(school.id, school);
  }

  if (currentSchool) {
    schoolsById.set(currentSchool.id, currentSchool);
  }

  const connectionByOtherSchoolId = new Map<string, SchoolConnection>();

  for (const connection of connections ?? []) {
    connectionByOtherSchoolId.set(
      otherSchoolId(connection, profile.school_id),
      connection,
    );
  }

  const incomingRequests = (connections ?? []).filter(
    (connection) =>
      connection.receiver_school_id === profile.school_id &&
      connection.status === "pending",
  );
  const activeMessage = getSearchValue(params.success);
  const errorMessage = getSearchValue(params.error);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">
          School connections
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Request and approve school-to-school connections. Student rosters and
          personal student data are not shared here.
        </p>
      </section>

      {activeMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {activeMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Your school</h2>
        {currentSchool ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailItem label="School name" value={currentSchool.name} />
            <DetailItem label="Slug" value={currentSchool.slug} />
            <DetailItem
              label="Province"
              value={currentSchool.province ?? "-"}
            />
            <DetailItem label="Status" value={currentSchool.status} />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            Your school record could not be loaded.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            Incoming requests
          </h2>
          {connectionsError ? (
            <p className="mt-2 text-sm text-red-600">
              Connections could not be loaded: {connectionsError.message}
            </p>
          ) : null}
        </div>
        {incomingRequests.length ? (
          <div className="grid gap-4 p-4">
            {incomingRequests.map((connection) => {
              const requester = schoolsById.get(connection.requester_school_id);

              return (
                <article
                  className="rounded-lg border border-zinc-200 p-4"
                  key={connection.id}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <SchoolSummary
                      fallback="Unknown school"
                      school={requester}
                      subtitle={`Requested ${formatDate(connection.requested_at)}`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <ConnectionResponseForm
                        connectionId={connection.id}
                        decision="approve"
                      />
                      <ConnectionResponseForm
                        connectionId={connection.id}
                        decision="reject"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm font-medium text-zinc-950">
              No incoming requests
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Connection requests from other schools will appear here for admin
              review.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            Other active schools
          </h2>
          {schoolsError ? (
            <p className="mt-2 text-sm text-red-600">
              Schools could not be loaded: {schoolsError.message}
            </p>
          ) : null}
        </div>
        {otherSchools.length ? (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {otherSchools.map((school) => {
              const connection = connectionByOtherSchoolId.get(school.id);

              return (
                <article
                  className="rounded-lg border border-zinc-200 p-4"
                  key={school.id}
                >
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <SchoolSummary
                        fallback="Unknown school"
                        school={school}
                        subtitle={school.province ?? school.slug}
                      />
                      {connection ? (
                        <ConnectionBadge status={connection.status} />
                      ) : null}
                    </div>
                    <div className="mt-auto">
                      {connection ? (
                        <p className="text-sm text-zinc-600">
                          {connectionDescription(connection, profile.school_id)}
                        </p>
                      ) : (
                        <RequestConnectionForm schoolId={school.id} />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm font-medium text-zinc-950">
              No other active schools yet
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Other active schools will appear here when they join the
              platform.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-950">
            Connection history
          </h2>
        </div>
        {connections?.length ? (
          <div className="grid gap-4 p-4">
            {connections.map((connection) => {
              const otherSchool = schoolsById.get(
                otherSchoolId(connection, profile.school_id),
              );

              return (
                <article
                  className="rounded-lg border border-zinc-200 p-4"
                  key={connection.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <SchoolSummary
                      fallback="Unknown school"
                      school={otherSchool}
                      subtitle={connectionDescription(
                        connection,
                        profile.school_id,
                      )}
                    />
                    <ConnectionBadge status={connection.status} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm font-medium text-zinc-950">
              No school connections yet
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Approved, rejected, and pending connections will be listed here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function RequestConnectionForm({ schoolId }: { schoolId: string }) {
  return (
    <form action={requestSchoolConnection}>
      <input name="receiver_school_id" type="hidden" value={schoolId} />
      <PendingSubmitButton
        className="h-10 w-full cursor-pointer rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 sm:w-auto"
        pendingLabel="Requesting..."
      >
        Request connection
      </PendingSubmitButton>
    </form>
  );
}

function ConnectionResponseForm({
  connectionId,
  decision,
}: {
  connectionId: string;
  decision: "approve" | "reject";
}) {
  const isApprove = decision === "approve";

  return (
    <form action={respondToSchoolConnection}>
      <input name="connection_id" type="hidden" value={connectionId} />
      <input name="decision" type="hidden" value={decision} />
      <PendingSubmitButton
        className={
          isApprove
            ? "h-10 cursor-pointer rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            : "h-10 cursor-pointer rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        }
        pendingLabel={isApprove ? "Approving..." : "Rejecting..."}
      >
        {isApprove ? "Approve" : "Reject"}
      </PendingSubmitButton>
    </form>
  );
}

function SchoolSummary({
  fallback,
  school,
  subtitle,
}: {
  fallback: string;
  school?: School;
  subtitle: string;
}) {
  return (
    <div>
      <h3 className="font-semibold text-zinc-950">
        {school?.name ?? fallback}
      </h3>
      <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>
      {school ? (
        <p className="mt-1 text-xs text-zinc-500">{school.slug}</p>
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

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const color =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "pending"
        ? "bg-amber-50 text-amber-700"
        : status === "rejected"
          ? "bg-red-50 text-red-700"
          : "bg-zinc-100 text-zinc-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>
      {formatStatus(status)}
    </span>
  );
}

function connectionDescription(
  connection: SchoolConnection,
  currentSchoolId: string,
) {
  const direction =
    connection.requester_school_id === currentSchoolId ? "Sent" : "Received";
  const date =
    connection.status === "pending"
      ? connection.requested_at
      : connection.responded_at ?? connection.requested_at;

  return `${direction} ${formatStatus(connection.status)} on ${formatDate(date)}`;
}

function otherSchoolId(
  connection: Pick<
    SchoolConnection,
    "requester_school_id" | "receiver_school_id"
  >,
  currentSchoolId: string,
) {
  return connection.requester_school_id === currentSchoolId
    ? connection.receiver_school_id
    : connection.requester_school_id;
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getSearchValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
