"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PAGE_PATH = "/school-connections";

type AdminProfile = {
  id: string;
  school_id: string;
  role: "school_admin" | "teacher" | "student";
};

type ExistingConnection = {
  id: string;
  status: string;
};

type PendingConnection = {
  id: string;
  receiver_school_id: string;
  status: string;
};

export async function requestSchoolConnection(formData: FormData) {
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const receiverSchoolId = String(
    formData.get("receiver_school_id") ?? "",
  ).trim();

  if (!isUuid(receiverSchoolId) || receiverSchoolId === profile.school_id) {
    redirectWithMessage("error", "Choose a valid school to connect with.");
  }

  const supabase = await createClient();
  const { data: receiverSchool } = await supabase
    .from("schools")
    .select("id")
    .eq("id", receiverSchoolId)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!receiverSchool) {
    redirectWithMessage("error", "That active school could not be found.");
  }

  const { data: existingConnection } = await supabase
    .from("school_connections")
    .select("id, status")
    .or(connectionPairFilter(profile.school_id, receiverSchoolId))
    .maybeSingle<ExistingConnection>();

  if (existingConnection) {
    redirectWithMessage(
      "error",
      `A ${formatStatus(existingConnection.status)} connection already exists with that school.`,
    );
  }

  const { error } = await supabase.from("school_connections").insert({
    requester_school_id: profile.school_id,
    receiver_school_id: receiverSchoolId,
    requested_by_profile_id: profile.id,
    status: "pending",
  });

  if (error) {
    redirectWithMessage(
      "error",
      error.code === "23505"
        ? "A connection already exists with that school."
        : `Connection request could not be sent: ${error.message}`,
    );
  }

  revalidatePath(PAGE_PATH);
  redirectWithMessage("success", "Connection request sent.");
}

export async function respondToSchoolConnection(formData: FormData) {
  const profile = await getCurrentSchoolAdminProfile();

  if (!profile) {
    redirect("/dashboard");
  }

  const connectionId = String(formData.get("connection_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const nextStatus =
    decision === "approve"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : null;

  if (!isUuid(connectionId) || !nextStatus) {
    redirectWithMessage("error", "Choose a valid connection response.");
  }

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("school_connections")
    .select("id, receiver_school_id, status")
    .eq("id", connectionId)
    .maybeSingle<PendingConnection>();

  if (
    !connection ||
    connection.receiver_school_id !== profile.school_id ||
    connection.status !== "pending"
  ) {
    redirectWithMessage("error", "That pending request could not be found.");
  }

  const { error } = await supabase
    .from("school_connections")
    .update({
      status: nextStatus,
      responded_by_profile_id: profile.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", connection.id)
    .eq("receiver_school_id", profile.school_id)
    .eq("status", "pending");

  if (error) {
    redirectWithMessage(
      "error",
      `Connection request could not be updated: ${error.message}`,
    );
  }

  revalidatePath(PAGE_PATH);
  redirectWithMessage(
    "success",
    nextStatus === "approved"
      ? "Connection request approved."
      : "Connection request rejected.",
  );
}

async function getCurrentSchoolAdminProfile(): Promise<AdminProfile | null> {
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
    return null;
  }

  return profile;
}

function connectionPairFilter(schoolA: string, schoolB: string) {
  return [
    `and(requester_school_id.eq.${schoolA},receiver_school_id.eq.${schoolB})`,
    `and(requester_school_id.eq.${schoolB},receiver_school_id.eq.${schoolA})`,
  ].join(",");
}

function redirectWithMessage(type: "error" | "success", message: string): never {
  redirect(`${PAGE_PATH}?${type}=${encodeURIComponent(message)}`);
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
