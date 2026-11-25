import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  attachmentTypeFromName,
  buildAttachmentPath,
  cleanAttachmentName,
  isControlledAttachmentPath,
  sniffAttachmentType,
} from "../src/lib/attachments/attachments.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const bytes = (...values) => new Uint8Array([...values, 0, 0, 0, 0]);
const SCHOOL = "11111111-1111-4111-8111-111111111111";
const CLUB = "22222222-2222-4222-8222-222222222222";
const FILE = "33333333-3333-4333-8333-333333333333";

test("staff can take the leader role away; the student stays a member", () => {
  const actions = read("src/app/(admin)/clubs/actions.ts");
  const revoke = actions.slice(actions.indexOf("export async function revokeClubLeader"));
  assert.match(revoke, /!profile \|\| !isStaff\(profile\)/);
  assert.match(revoke, /\.update\(\{ role: "member" \}\)[\s\S]*?\.eq\("school_id", profile\.school_id\)[\s\S]*?\.eq\("role", "leader"\)/);
  assert.match(read("src/app/(admin)/clubs/page.tsx"), /<form action=\{revokeClubLeader\}>/);
});

test("students can be filtered by grade and class", () => {
  const page = read("src/app/(admin)/students/page.tsx");
  assert.match(page, /studentsQuery\.eq\("grade_level", selectedGrade\)/);
  assert.match(page, /studentsQuery\.eq\("homeroom", selectedClass\)/);
  // Filters survive paging and the status chips.
  assert.match(page, /params\.set\("grade", filters\.grade\)/);
  assert.match(page, /params\.set\("class", filters\.classGroup\)/);
});

test("only real PDF and Word files are accepted, whatever the name says", () => {
  assert.equal(sniffAttachmentType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d)), "application/pdf");
  assert.equal(sniffAttachmentType(bytes(0x50, 0x4b, 0x03, 0x04)), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal(sniffAttachmentType(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)), "application/msword");
  assert.equal(sniffAttachmentType(bytes(0x3c, 0x68, 0x74, 0x6d, 0x6c)), null); // "<html"
  assert.equal(sniffAttachmentType(bytes(0x4d, 0x5a)), null); // a program
  assert.equal(attachmentTypeFromName("plan.PDF"), "application/pdf");
  assert.equal(attachmentTypeFromName("virus.exe"), null);
});

test("file names are cleaned and paths are fixed by the server", () => {
  assert.equal(cleanAttachmentName("../../etc/Хуваарь\u0000 2026.pdf", "application/pdf"), "Хуваарь 2026.pdf");
  assert.equal(cleanAttachmentName("report.exe.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), "report.exe.docx");
  assert.equal(cleanAttachmentName("", "application/pdf"), "file.pdf");
  const path = buildAttachmentPath(SCHOOL, "club", CLUB, FILE, "application/pdf");
  assert.equal(isControlledAttachmentPath(path, SCHOOL, "club", CLUB), true);
  assert.equal(isControlledAttachmentPath(path, SCHOOL, "event", CLUB), false);
  assert.equal(isControlledAttachmentPath(`${SCHOOL}/club/${CLUB}/../x.pdf`, SCHOOL, "club", CLUB), false);
});

test("uploads and downloads are checked against the club, event or announcement", () => {
  const actions = read("src/app/(admin)/attachments/actions.ts");
  assert.match(actions, /if \(!access\?\.canManage\) return \{ code: "denied", ok: false \};/);
  assert.match(actions, /sniffAttachmentType\(bytes\)/);
  assert.match(actions, /await bucket\.remove\(\[input\.path\]\);/);
  const route = read("src/app/(admin)/files/[id]/route.ts");
  assert.match(route, /if \(!access\?\.canView \|\| access\.schoolId !== file\.school_id\) return notFound\(\);/);
  assert.match(route, /"Content-Disposition": `attachment;/);
  assert.match(route, /"X-Content-Type-Options": "nosniff"/);
  const access = read("src/lib/attachments/attachment-access.ts");
  assert.match(access, /school_id !== actor\.school_id\) return null;/);
  const sql = read("supabase/migrations/202611250001_add_attachments.sql");
  assert.match(sql, /'attachments',\s+false,\s+10485760/);
  assert.match(sql, /revoke all on public\.attachments from anon, authenticated;/);
  assert.doesNotMatch(sql, /grant /);
});
