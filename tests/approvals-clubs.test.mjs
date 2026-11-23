import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Approvals has a New clubs tab that lists pending club proposals", () => {
  const page = read("src/app/(admin)/approvals/page.tsx");
  const clubs = read("src/app/(admin)/approvals/club-approvals.tsx");

  assert.match(page, /\/approvals\?type=clubs/);
  assert.match(page, /<ClubApprovals/);
  assert.match(clubs, /\.eq\("status", "pending"\)/);
  assert.match(clubs, /approveClubRequest/);
  assert.match(clubs, /advisor_profile_id/);
});

test("Approvals comes right after Home for staff", () => {
  const shell = read("src/app/(admin)/_components/app-shell.tsx");

  for (const role of ["school_admin", "teacher"]) {
    const block = shell.slice(shell.indexOf(`  ${role}: [`));
    const home = block.indexOf('"/dashboard"');
    const approvals = block.indexOf('"/approvals"');
    const events = block.indexOf('"/events"');
    assert.ok(home < approvals && approvals < events, role);
  }
  const tabs = shell.slice(shell.lastIndexOf('href: "/dashboard", icon: "home"'));
  assert.ok(tabs.indexOf('"/approvals"') < tabs.indexOf('"/events"'));
});

test("deciding a club refreshes Approvals", () => {
  assert.match(read("src/app/(admin)/club-requests/actions.ts"), /revalidatePath\("\/approvals"\)/);
});
