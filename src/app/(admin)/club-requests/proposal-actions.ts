"use server";

import { revalidatePath } from "next/cache";
import { parseActivityCategory } from "@/lib/activity-categories";
import { logServerError } from "@/lib/errors/server-error";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import { getCurrentLocale } from "@/lib/i18n/get-locale";
import { notify } from "@/lib/notifications/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  FOUNDERS_REQUIRED,
  MAX_FOUNDERS,
  MAX_OPEN_PROPOSALS,
  canSubmitProposal,
  founderDisplayName,
} from "./proposal-rules";

type Admin = ReturnType<typeof createAdminClient>;

type Student = { id: string; school_id: string };

type RosterRow = {
  first_name: string;
  homeroom: string | null;
  last_name: string;
  preferred_name: string | null;
  profile_id: string;
};

type FounderRow = {
  id: string;
  is_proposer: boolean;
  profile_id: string;
  status: "confirmed" | "declined" | "invited";
};

export type FounderCandidate = { displayName: string; homeroom: string | null; profileId: string };

export type ProposalState = { message: string; success: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Names for the founder picker. Runs as the student through
// search_school_students, which only returns signed-up classmates of the same
// school who have not hidden their name.
export async function searchFounderCandidates(query: string): Promise<FounderCandidate[]> {
  const term = String(query ?? "").trim().slice(0, 40);

  if (term.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_school_students", { search: term });

  if (error) {
    logServerError("Founder search failed", error);
    return [];
  }

  return ((data ?? []) as Array<{ display_name: string; homeroom: string | null; profile_id: string }>).map(
    (row) => ({ displayName: row.display_name, homeroom: row.homeroom, profileId: row.profile_id }),
  );
}

export async function createClubProposal(
  _state: ProposalState,
  formData: FormData,
): Promise<ProposalState> {
  const t = await getT();
  const student = await getCurrentStudent();

  if (!student) return fail(t("clubRequests.errors.studentsOnlyCreate"));

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 2000);
  const categoryInput = String(formData.get("category") ?? "").trim();
  const category = parseActivityCategory(categoryInput);
  const founderIds = readFounderIds(formData, student.id);

  if (!title) return fail(t("clubRequests.errors.titleRequired"));
  if (categoryInput && !category) return fail(t("clubRequests.errors.invalidCategory"));
  if (!reason) return fail(t("clubRequests.proposal.errors.reasonRequired"));
  if (founderIds.length < FOUNDERS_REQUIRED - 1) return fail(t("clubRequests.proposal.errors.tooFewFounders"));
  if (founderIds.length > MAX_FOUNDERS - 1) return fail(t("clubRequests.proposal.errors.tooManyFounders"));

  const admin = createAdminClient();
  const { count } = await admin
    .from("club_requests")
    .select("id", { count: "exact", head: true })
    .eq("school_id", student.school_id)
    .eq("created_by_profile_id", student.id)
    .in("status", ["gathering", "pending"]);

  if ((count ?? 0) >= MAX_OPEN_PROPOSALS) return fail(t("clubRequests.errors.tooManyPending"));

  const people = await getStudentRosters(admin, student.school_id, [student.id, ...founderIds]);
  const me = people.get(student.id);

  if (!me) return fail(t("clubRequests.proposal.errors.noRoster"));
  if (founderIds.some((id) => !people.get(id)?.visible)) return fail(t("clubRequests.proposal.errors.invalidFounder"));

  const { data: request, error } = await admin
    .from("club_requests")
    .insert({
      category: category || null,
      created_by_profile_id: student.id,
      description: description || null,
      reason,
      school_id: student.school_id,
      status: "gathering",
      title,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !request) {
    logServerError("Club proposal creation failed", error);
    return fail(t("clubRequests.errors.createFailed"));
  }

  const now = new Date().toISOString();
  const { error: foundersError } = await admin.from("club_request_founders").insert([
    {
      club_request_id: request.id,
      is_proposer: true,
      profile_id: student.id,
      responded_at: now,
      school_id: student.school_id,
      status: "confirmed",
    },
    // Every row carries every column: in a bulk insert, a key missing from
    // one row is sent as null, not as the column default.
    ...founderIds.map((profileId) => ({
      club_request_id: request.id,
      is_proposer: false,
      profile_id: profileId,
      responded_at: null,
      school_id: student.school_id,
      status: "invited",
    })),
  ]);

  if (foundersError) {
    logServerError("Club proposal founders insert failed", foundersError);
    await admin.from("club_requests").delete().eq("id", request.id);
    return fail(t("clubRequests.errors.createFailed"));
  }

  await notify(
    admin,
    founderIds.map((profileId) => ({
      data: { club: title, proposer: founderDisplayName(me) },
      kind: "founder_invited",
      link: `/club-requests#proposal-${request.id}`,
      recipientProfileId: profileId,
      schoolId: student.school_id,
    })),
  );

  revalidateProposalPaths();
  return { message: t("clubRequests.proposal.success.created"), success: true };
}

export async function respondToFounderInvite(formData: FormData) {
  const student = await getCurrentStudent();
  const requestId = String(formData.get("club_request_id") ?? "");
  const answer = String(formData.get("answer") ?? "");

  if (!student || !UUID.test(requestId) || !["confirm", "decline"].includes(answer)) return;

  const admin = createAdminClient();
  const request = await getGatheringRequest(admin, requestId, student.school_id);

  if (!request) return;

  const { data: updated } = await admin
    .from("club_request_founders")
    .update({ responded_at: new Date().toISOString(), status: answer === "confirm" ? "confirmed" : "declined" })
    .eq("club_request_id", requestId)
    .eq("profile_id", student.id)
    .eq("status", "invited")
    .eq("is_proposer", false)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (!updated) return;

  const people = await getStudentRosters(admin, student.school_id, [student.id]);
  const me = people.get(student.id);

  await notify(admin, [
    {
      data: { club: request.title, name: me ? founderDisplayName(me) : "" },
      kind: answer === "confirm" ? "founder_confirmed" : "founder_declined",
      link: `/club-requests#proposal-${requestId}`,
      recipientProfileId: request.created_by_profile_id,
      schoolId: student.school_id,
    },
  ]);

  await submitIfReady(admin, request);
  revalidateProposalPaths();
}

// The proposer tags more students, usually to replace someone who declined.
export async function addProposalFounders(formData: FormData) {
  const student = await getCurrentStudent();
  const requestId = String(formData.get("club_request_id") ?? "");

  if (!student || !UUID.test(requestId)) return;

  const admin = createAdminClient();
  const request = await getGatheringRequest(admin, requestId, student.school_id);

  if (!request || request.created_by_profile_id !== student.id) return;

  const founders = await getFounders(admin, requestId);
  const activeIds = new Set(founders.filter((f) => f.status !== "declined").map((f) => f.profile_id));
  const newIds = readFounderIds(formData, student.id).filter((id) => !activeIds.has(id));

  if (!newIds.length || activeIds.size + newIds.length > MAX_FOUNDERS) return;

  const people = await getStudentRosters(admin, student.school_id, [student.id, ...newIds]);
  const me = people.get(student.id);
  const valid = newIds.filter((id) => people.get(id)?.visible);

  if (!me || !valid.length) return;

  const declined = new Set(founders.filter((f) => f.status === "declined").map((f) => f.profile_id));
  const reinvite = valid.filter((id) => declined.has(id));
  const fresh = valid.filter((id) => !declined.has(id));

  if (reinvite.length) {
    await admin
      .from("club_request_founders")
      .update({ responded_at: null, status: "invited" })
      .eq("club_request_id", requestId)
      .in("profile_id", reinvite);
  }

  if (fresh.length) {
    await admin.from("club_request_founders").insert(
      fresh.map((profileId) => ({
        club_request_id: requestId,
        is_proposer: false,
        profile_id: profileId,
        responded_at: null,
        school_id: student.school_id,
        status: "invited",
      })),
    );
  }

  await notify(
    admin,
    valid.map((profileId) => ({
      data: { club: request.title, proposer: founderDisplayName(me) },
      kind: "founder_invited",
      link: `/club-requests#proposal-${requestId}`,
      recipientProfileId: profileId,
      schoolId: student.school_id,
    })),
  );

  revalidateProposalPaths();
}

export async function withdrawProposal(formData: FormData) {
  const student = await getCurrentStudent();
  const requestId = String(formData.get("club_request_id") ?? "");

  if (!student || !UUID.test(requestId)) return;

  await createAdminClient()
    .from("club_requests")
    .update({ status: "archived" })
    .eq("id", requestId)
    .eq("school_id", student.school_id)
    .eq("created_by_profile_id", student.id)
    .in("status", ["gathering", "pending"]);

  revalidateProposalPaths();
}

// Once every tagged student has answered and enough confirmed, the proposal
// leaves the founders and goes to the school admins.
async function submitIfReady(
  admin: Admin,
  request: { created_by_profile_id: string; id: string; school_id: string; title: string },
) {
  const founders = await getFounders(admin, request.id);

  if (!canSubmitProposal(founders.map((f) => f.status))) return;

  const { data: moved } = await admin
    .from("club_requests")
    .update({ status: "pending" })
    .eq("id", request.id)
    .eq("status", "gathering")
    .select("id")
    .maybeSingle<{ id: string }>();

  if (!moved) return;

  const proposer = (await getStudentRosters(admin, request.school_id, [request.created_by_profile_id])).get(
    request.created_by_profile_id,
  );
  const { data: schoolAdmins } = await admin
    .from("profiles")
    .select("id")
    .eq("school_id", request.school_id)
    .eq("role", "school_admin")
    .eq("status", "active")
    .returns<Array<{ id: string }>>();

  await notify(admin, [
    ...founders
      .filter((f) => f.status === "confirmed")
      .map((f) => ({
        data: { club: request.title },
        kind: "proposal_ready" as const,
        link: `/club-requests#proposal-${request.id}`,
        recipientProfileId: f.profile_id,
        schoolId: request.school_id,
      })),
    ...(schoolAdmins ?? []).map((staff) => ({
      data: { club: request.title, proposer: proposer ? founderDisplayName(proposer) : "" },
      kind: "proposal_submitted" as const,
      link: "/club-requests?status=pending",
      recipientProfileId: staff.id,
      schoolId: request.school_id,
    })),
  ]);
}

async function getGatheringRequest(admin: Admin, requestId: string, schoolId: string) {
  const { data } = await admin
    .from("club_requests")
    .select("id, school_id, title, created_by_profile_id")
    .eq("id", requestId)
    .eq("school_id", schoolId)
    .eq("status", "gathering")
    .maybeSingle<{ created_by_profile_id: string; id: string; school_id: string; title: string }>();

  return data;
}

async function getFounders(admin: Admin, requestId: string) {
  const { data } = await admin
    .from("club_request_founders")
    .select("id, profile_id, status, is_proposer")
    .eq("club_request_id", requestId)
    .returns<FounderRow[]>();

  return data ?? [];
}

// Active, signed-up students of the school, by profile id. Whether a student
// may be TAGGED also needs `visible` (their name is not hidden); the proposer
// and someone answering their own invitation are looked up without it.
async function getStudentRosters(admin: Admin, schoolId: string, profileIds: string[]) {
  // Two plain reads: student_rosters links to profiles twice (the student and
  // the staff member who added them), so an embedded join is ambiguous.
  const [{ data: rosters, error: rosterError }, { data: students, error: studentError }] = await Promise.all([
    admin
      .from("student_rosters")
      .select("profile_id, first_name, last_name, preferred_name, homeroom, show_name_to_classmates")
      .eq("school_id", schoolId)
      .eq("status", "active")
      .in("profile_id", profileIds)
      .returns<Array<RosterRow & { show_name_to_classmates: boolean }>>(),
    admin
      .from("profiles")
      .select("id")
      .eq("school_id", schoolId)
      .eq("role", "student")
      .eq("status", "active")
      .in("id", profileIds)
      .returns<Array<{ id: string }>>(),
  ]);

  if (rosterError || studentError) {
    logServerError("Founder roster lookup failed", rosterError ?? studentError);
  }

  const activeStudents = new Set((students ?? []).map((student) => student.id));

  return new Map(
    (rosters ?? [])
      .filter((row) => activeStudents.has(row.profile_id))
      .map((row) => [row.profile_id, { ...row, visible: row.show_name_to_classmates }]),
  );
}

async function getCurrentStudent(): Promise<Student | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, school_id")
    .eq("id", user.id)
    .eq("role", "student")
    .eq("status", "active")
    .maybeSingle<Student>();

  return data ?? null;
}

function readFounderIds(formData: FormData, selfId: string) {
  return Array.from(
    new Set(
      formData
        .getAll("founder_profile_ids")
        .map((value) => String(value))
        .filter((value) => UUID.test(value) && value !== selfId),
    ),
  );
}

async function getT() {
  const dictionary = getDictionary(await getCurrentLocale());
  return (key: string) => translate(dictionary, key);
}

function fail(message: string): ProposalState {
  return { message, success: false };
}

function revalidateProposalPaths() {
  revalidatePath("/club-requests");
  revalidatePath("/", "layout");
}
