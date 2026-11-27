import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("only the leader, supervising teacher or a school admin post, take attendance or delete", () => {
  const actions = read("src/app/(admin)/clubs/club-life-actions.ts");
  assert.match(actions, /return access\?\.canReview \? \{ access, actor, admin \} : null;/);
  for (const name of ["postToClub", "deleteClubPost", "saveClubMeeting", "deleteClubMeeting"]) {
    const body = actions.slice(actions.indexOf(`export async function ${name}`));
    assert.match(body.slice(0, 900), /managerAccess\(/, name);
  }
  // Attendance is only recorded for the club's current members.
  assert.match(actions, /\.from\("club_memberships"\)[\s\S]*?\.eq\("club_id", clubId\)[\s\S]*?\.eq\("status", "active"\)/);
});

test("members read posts and only their own attendance; others see nothing", () => {
  const life = read("src/lib/clubs/club-life.ts");
  assert.match(life, /if \(!access\.canManage && !access\.isMember\) return empty;/);
  assert.match(life, /if \(!access\.canManage\) query = query\.eq\("student_roster_id", access\.rosterId \?\? ""\);/);
  assert.match(life, /meetings: access\.canManage \? allMeetings : \[\]/);
  const page = read("src/app/(admin)/clubs/[clubId]/page.tsx");
  assert.match(page, /\.\.\.\(canManageClub \|\| isClubMember\s*\? \[/);
  assert.match(page, /id: "members"/);
  assert.match(page, /id: "attendance"/);
});

test("the new tables are closed to clients", () => {
  const sql = read("supabase/migrations/202611270001_add_club_posts_and_meetings.sql");
  for (const table of ["club_posts", "club_meetings", "club_meeting_attendance"]) {
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated;`), table);
  }
  assert.doesNotMatch(sql, /grant /);
  assert.match(sql, /status in \('present', 'absent', 'excused'\)/);
});

test("members are told about new posts", () => {
  assert.match(read("src/lib/notifications/notify.ts"), /"club_post"/);
  assert.match(read("src/app/(admin)/clubs/club-life-actions.ts"), /kind: "club_post" as const,[\s\S]*?link: `\/clubs\/\$\{clubId\}#posts`/);
});
