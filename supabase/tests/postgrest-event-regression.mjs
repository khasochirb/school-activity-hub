import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";

const apiUrl = requireLocalUrl("LOCAL_SUPABASE_URL");
const anonKey = requireEnvironment("LOCAL_SUPABASE_ANON_KEY");
const jwtSecret = requireEnvironment("LOCAL_SUPABASE_JWT_SECRET");

const identities = {
  platformAdmin: "cccccccc-0000-4000-8000-000000003001",
  schoolAdmin: "aaaaaaaa-0000-4000-8000-000000001001",
  student: "aaaaaaaa-0000-4000-8000-000000001004",
  teacher: "aaaaaaaa-0000-4000-8000-000000001003",
};
const schools = {
  a: "aaaaaaaa-0000-4000-8000-000000000001",
  b: "bbbbbbbb-0000-4000-8000-000000000001",
};
const staff = {
  a: identities.teacher,
  b: "bbbbbbbb-0000-4000-8000-000000002002",
};

const quickViewSelect = [
  "id",
  "school_id",
  "club_id",
  "created_by_profile_id",
  "title",
  "description",
  "category",
  "location",
  "starts_at",
  "ends_at",
  "capacity",
  "status",
  "allow_connected_school_registration",
  "risk_level",
  "permission_required",
  "permission_note",
  "responsible_staff_id",
  "eligibility_notes",
  "experience_level",
  "accessibility_notes",
  "cost_type",
  "cost_amount",
  "cost_currency",
  "cost_notes",
  "required_materials",
  "expected_commitment",
].join(",");
const detailSelect = [
  quickViewSelect,
  "submitted_at",
  "approved_at",
  "rejection_reason",
  "created_at",
  "updated_at",
].join(",");
const approvalSelect = [quickViewSelect, "submitted_at", "created_at"].join(",");
const profileRelationshipSelect = [
  "id",
  "creator:profiles!events_created_by_profile_id_fkey(id,full_name)",
  "responsible_staff:profiles!events_responsible_staff_school_fk(id,full_name,role,status)",
].join(",");

const createdIds = [];

await verifyRelationshipResolution();
await verifySchemaDriftSignatures();
await verifyRoleLists();
await verifyCreationFlows();
await verifyPageQueries();
await verifyRoleBoundaries();

console.log("POSTGREST_EVENT_REGRESSION_TESTS_PASSED");

async function verifyRelationshipResolution() {
  const ambiguous = await request(
    identities.teacher,
    `/events?select=${encodeURIComponent("id,profiles(id,full_name)")}`,
  );
  assert.equal(ambiguous.status, 300);
  assert.equal(ambiguous.body.code, "PGRST201");

  const explicit = await request(
    identities.teacher,
    `/events?select=${encodeURIComponent(profileRelationshipSelect)}&limit=5`,
  );
  assert.equal(explicit.status, 200);
  assert.ok(Array.isArray(explicit.body));
}

async function verifySchemaDriftSignatures() {
  const missingSelectColumn = await request(
    identities.teacher,
    "/events?select=id,production_missing_event_column&limit=1",
  );
  assert.equal(missingSelectColumn.status, 400);
  assert.equal(missingSelectColumn.body.code, "42703");

  const missingPayloadColumn = await request(identities.teacher, "/events", {
    body: { production_missing_event_column: true },
    method: "POST",
    prefer: "return=minimal",
  });
  assert.equal(missingPayloadColumn.status, 400);
  assert.equal(missingPayloadColumn.body.code, "PGRST204");
}

async function verifyRoleLists() {
  for (const identity of [identities.teacher, identities.schoolAdmin]) {
    const result = await request(
      identity,
      `/events?select=${encodeURIComponent(quickViewSelect)}&order=starts_at.asc&limit=40`,
    );
    assert.equal(result.status, 200);
    assert.ok(result.body.length > 0);
    assert.ok(result.body.every((event) => event.school_id === schools.a));
  }

  const platform = await request(
    identities.platformAdmin,
    `/events?select=${encodeURIComponent(quickViewSelect)}&order=starts_at.asc&limit=40`,
  );
  assert.equal(platform.status, 200);
  assert.ok(new Set(platform.body.map((event) => event.school_id)).size >= 2);

  const schoolB = await request(
    identities.platformAdmin,
    `/events?select=${encodeURIComponent(quickViewSelect)}&school_id=eq.${schools.b}`,
  );
  assert.equal(schoolB.status, 200);
  assert.ok(schoolB.body.length > 0);
  assert.ok(schoolB.body.every((event) => event.school_id === schools.b));
}

async function verifyCreationFlows() {
  const teacherEvent = await createEvent({
    actorId: identities.teacher,
    creatorId: identities.teacher,
    label: "teacher",
    responsibleStaffId: staff.a,
    schoolId: schools.a,
  });
  const adminEvent = await createEvent({
    actorId: identities.schoolAdmin,
    creatorId: identities.schoolAdmin,
    label: "school-admin",
    responsibleStaffId: staff.a,
    schoolId: schools.a,
  });
  await createEvent({
    actorId: identities.platformAdmin,
    creatorId: null,
    label: "platform-admin",
    responsibleStaffId: staff.b,
    schoolId: schools.b,
  });

  for (const eventId of [teacherEvent, adminEvent]) {
    const relationshipResult = await request(
      identities.schoolAdmin,
      `/events?id=eq.${eventId}&select=${encodeURIComponent(profileRelationshipSelect)}`,
    );
    assert.equal(relationshipResult.status, 200);
    assert.equal(relationshipResult.body.length, 1);
    assert.ok(relationshipResult.body[0].creator?.full_name);
    assert.ok(relationshipResult.body[0].responsible_staff?.full_name);
  }
}

async function createEvent({
  actorId,
  creatorId,
  label,
  responsibleStaffId,
  schoolId,
}) {
  const id = randomUUID();
  const startsAt = new Date(Date.now() + 14 * 86_400_000).toISOString();
  const endsAt = new Date(Date.now() + 14 * 86_400_000 + 3_600_000).toISOString();
  const payload = {
    accessibility_notes: "Step-free room",
    allow_connected_school_registration: false,
    approved_at: new Date().toISOString(),
    approved_by_profile_id: creatorId,
    capacity: 20,
    category: "Academic",
    club_id: null,
    cost_amount: null,
    cost_currency: null,
    cost_notes: null,
    cost_type: "free",
    created_by_profile_id: creatorId,
    description: "Synthetic local API test",
    eligibility_notes: "Open to students",
    ends_at: endsAt,
    expected_commitment: "One hour",
    experience_level: "beginner_friendly",
    id,
    location: "Local test room",
    permission_note: null,
    permission_required: false,
    required_materials: "Notebook",
    responsible_staff_id: responsibleStaffId,
    risk_level: "low",
    school_id: schoolId,
    starts_at: startsAt,
    status: "approved",
    submitted_at: new Date().toISOString(),
    submitted_by_profile_id: creatorId,
    title: `PostgREST ${label} event`,
  };

  const inserted = await request(actorId, "/events", {
    body: payload,
    method: "POST",
    prefer: "return=minimal",
  });
  assert.equal(inserted.status, 201);

  const readback = await request(
    actorId,
    `/events?id=eq.${id}&school_id=eq.${schoolId}&select=${encodeURIComponent("id,school_id")}`,
  );
  assert.equal(readback.status, 200);
  assert.deepEqual(readback.body, [{ id, school_id: schoolId }]);

  const retry = await request(actorId, "/events", {
    body: payload,
    method: "POST",
    prefer: "return=minimal",
  });
  assert.equal(retry.status, 409);
  assert.equal(retry.body.code, "23505");

  const duplicateCheck = await request(
    actorId,
    `/events?id=eq.${id}&select=id`,
  );
  assert.equal(duplicateCheck.body.length, 1);
  createdIds.push(id);
  return id;
}

async function verifyPageQueries() {
  const eventId = createdIds[0];
  for (const [label, path] of [
    ["quick-view", `/events?id=eq.${eventId}&select=${encodeURIComponent(quickViewSelect)}`],
    ["detail", `/events?id=eq.${eventId}&select=${encodeURIComponent(detailSelect)}`],
    ["dashboard", `/events?school_id=eq.${schools.a}&status=eq.approved&select=${encodeURIComponent(quickViewSelect)}&limit=5`],
    ["approvals", `/events?status=eq.pending_approval&select=${encodeURIComponent(approvalSelect)}`],
  ]) {
    const result = await request(identities.schoolAdmin, path);
    assert.equal(result.status, 200, `${label} query failed`);
    assert.ok(Array.isArray(result.body));
  }

  const attendeeDashboard = await request(
    identities.student,
    `/event_attendees?select=${encodeURIComponent("id,events!event_attendees_event_school_fk!inner(id)")}&limit=5`,
  );
  assert.equal(attendeeDashboard.status, 200);
}

async function verifyRoleBoundaries() {
  const teacherCrossSchool = await request(
    identities.teacher,
    `/events?school_id=eq.${schools.b}&select=id`,
  );
  assert.equal(teacherCrossSchool.status, 200);
  assert.equal(teacherCrossSchool.body.length, 0);

  const forbiddenStudentInsert = await request(identities.student, "/events", {
    body: {
      id: randomUUID(),
      school_id: schools.a,
      title: "Forbidden student event",
      location: "Nowhere",
      starts_at: new Date(Date.now() + 20 * 86_400_000).toISOString(),
      ends_at: new Date(Date.now() + 20 * 86_400_000 + 3_600_000).toISOString(),
      status: "approved",
    },
    method: "POST",
    prefer: "return=minimal",
  });
  assert.equal(forbiddenStudentInsert.status, 403);
  assert.equal(forbiddenStudentInsert.body.code, "42501");

  const staffOptions = await request(
    identities.platformAdmin,
    `/rpc/get_platform_event_staff_options?target_school_id=${schools.a}`,
  );
  assert.equal(staffOptions.status, 200);
  assert.ok(staffOptions.body.length > 0);
  assert.ok(staffOptions.body.every((profile) => profile.id !== identities.student));
}

async function request(identityId, path, options = {}) {
  const response = await fetch(`${apiUrl}/rest/v1${path}`, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${createToken(identityId)}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    method: options.method ?? "GET",
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { body, status: response.status };
}

function createToken(subject) {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: "supabase-demo",
    role: "authenticated",
    sub: subject,
  });
  const signature = createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function requireEnvironment(name) {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required`);
  return value;
}

function requireLocalUrl(name) {
  const value = new URL(requireEnvironment(name));
  assert.ok(
    value.hostname === "127.0.0.1" || value.hostname === "localhost",
    `${name} must be loopback-only`,
  );
  return value.origin;
}
