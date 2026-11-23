import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { collectAnswers, parseJoinMode, parseQuestions } from "../src/lib/clubs/join-form.ts";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("the form builder's questions are checked before saving", () => {
  assert.equal(parseQuestions("not json").error, "invalidForm");
  assert.equal(parseQuestions(JSON.stringify([{ kind: "short", prompt: "  " }])).error, "emptyQuestion");
  assert.equal(parseQuestions(JSON.stringify([{ kind: "essay", prompt: "Why?" }])).error, "invalidForm");
  assert.equal(
    parseQuestions(JSON.stringify([{ kind: "choice", options: ["Yes", " ", "Yes"], prompt: "Grade?" }])).error,
    "needTwoOptions",
  );
  const ok = parseQuestions(
    JSON.stringify([
      { kind: "long", prompt: " Why do you want to join? ", required: true },
      { kind: "checkbox", options: ["Mon", "Wed", ""], prompt: "Which days?", required: false },
    ]),
  );
  assert.deepEqual(ok.questions, [
    { id: undefined, kind: "long", options: [], prompt: "Why do you want to join?", required: true },
    { id: undefined, kind: "checkbox", options: ["Mon", "Wed"], prompt: "Which days?", required: false },
  ]);
  assert.equal(parseQuestions(JSON.stringify(Array.from({ length: 16 }, () => ({ kind: "short", prompt: "Q" })))).error, "tooManyQuestions");
  assert.equal(parseJoinMode("apply"), "apply");
  assert.equal(parseJoinMode("anything"), null);
});

test("answers must match the questions", () => {
  const questions = [
    { id: "a", kind: "long", options: [], prompt: "Why?", required: true },
    { id: "b", kind: "choice", options: ["9", "10"], prompt: "Grade", required: true },
    { id: "c", kind: "checkbox", options: ["Mon", "Wed"], prompt: "Days", required: false },
  ];
  const form = (values) => (name) => values[name] ?? [];

  assert.deepEqual(collectAnswers(questions, form({ q_b: ["9"] })), { error: "answerRequired", questionId: "a" });
  // A made-up choice counts as no answer.
  assert.equal(collectAnswers(questions, form({ q_a: ["I like it"], q_b: ["12"] })).questionId, "b");
  const result = collectAnswers(questions, form({ q_a: ["I like it"], q_b: ["10"], q_c: ["Wed", "Sun"] }));
  assert.deepEqual(result.answers.map((item) => item.answer), ["I like it", "10", ["Wed"]]);
  assert.equal(result.answers[0].prompt, "Why?");
});

test("only the leader, the supervising teacher or a school admin review requests", () => {
  const access = read("src/lib/clubs/club-access.ts");
  assert.match(access, /canReview: isLeader \|\| isSupervisor \|\| isSchoolAdmin/);
  assert.match(access, /club\.school_id !== actor\.school_id/);
  const actions = read("src/app/(admin)/clubs/join-actions.ts");
  assert.match(actions, /if \(!access\?\.canReview\) return;/);
  assert.match(actions, /if \(!access\?\.canReview\) return fail\(t, "notAllowed"\);/);
  // Two reviewers deciding at once cannot both win.
  assert.match(actions, /\.eq\("id", request\.id\)\s*\.eq\("status", "pending"\)/);
  assert.match(read("src/app/(admin)/clubs/[clubId]/applications/page.tsx"), /if \(!access\?\.canReview\) notFound\(\);/);
});

test("clubs that take applications can't be joined directly", () => {
  const actions = read("src/app/(admin)/clubs/actions.ts");
  assert.match(actions, /if \(club\.join_mode === "apply"\) \{\s*redirect\(`\/clubs\/\$\{club\.id\}\/apply`\);/);
  assert.match(read("src/app/(admin)/club-requests/actions.ts"), /join_mode: "apply"/);
});

test("the database keeps writes server-side and one open request per student", () => {
  const migration = read("supabase/migrations/202611230003_add_club_join_applications.sql");
  assert.match(migration, /revoke all on public\.club_join_requests from anon, authenticated;/);
  assert.match(migration, /grant select on public\.club_join_requests to authenticated;/);
  assert.doesNotMatch(migration, /grant (insert|update|delete)/);
  assert.match(migration, /club_join_requests_one_pending[\s\S]*where status = 'pending'/);
  assert.match(migration, /add column if not exists join_mode text not null default 'open'/);
  assert.match(read("supabase/schema.sql"), /create table if not exists public\.club_join_requests/);
});
