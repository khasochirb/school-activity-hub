import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function filesUnder(path) {
  const absoluteRoot = join(root, path);
  const files = [];

  for (const entry of readdirSync(absoluteRoot)) {
    const absolutePath = join(absoluteRoot, entry);

    if (statSync(absolutePath).isDirectory()) {
      files.push(...filesUnder(relative(root, absolutePath)));
    } else {
      files.push(relative(root, absolutePath).replaceAll("\\", "/"));
    }
  }

  return files;
}

test("local environment files are ignored and only the placeholder example is tracked", () => {
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const trackedEnvironmentFiles = tracked.filter((path) =>
    /(^|\/)\.env(?:\.|$)/.test(path),
  );

  assert.deepEqual(trackedEnvironmentFiles, [".env.example"]);
  assert.doesNotThrow(() =>
    execFileSync("git", ["check-ignore", "-q", ".env.local"], {
      cwd: root,
    }),
  );

  const exampleAssignments = read(".env.example")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line));

  for (const assignment of exampleAssignments) {
    const [name, value = ""] = assignment.split("=", 2);
    assert.match(value, /^(|0|1|true|false)$/i, `${name} must be a placeholder`);
  }
});

test("privileged and request-bound helpers are explicitly server-only", () => {
  const serverOnlyModules = [
    "src/lib/audit/platform-audit-query.ts",
    "src/lib/audit/platform-audit.ts",
    "src/lib/auth/current-user.ts",
    "src/lib/auth/event-access.ts",
    "src/lib/auth/platform-admin.ts",
    "src/lib/auth/sensitive-workflows.ts",
    "src/lib/errors/server-error.ts",
    "src/lib/get-theme.ts",
    "src/lib/i18n/get-locale.ts",
    "src/lib/server-timing.ts",
    "src/lib/server-url.ts",
    "src/lib/supabase/admin.ts",
    "src/lib/supabase/bootstrap.ts",
    "src/lib/supabase/server.ts",
  ];

  for (const path of serverOnlyModules) {
    assert.match(read(path), /import ["']server-only["'];/, path);
  }
});

test("service-role configuration is confined to the server-only admin module", () => {
  const sourceFiles = filesUnder("src").filter((path) => /\.[cm]?[jt]sx?$/.test(path));
  const references = sourceFiles.filter((path) =>
    read(path).includes("SUPABASE_SERVICE_ROLE_KEY"),
  );

  assert.deepEqual(references, ["src/lib/supabase/admin.ts"]);
  assert.doesNotMatch(
    read("src/lib/supabase/admin.ts"),
    /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/,
  );
});

test("client modules cannot import privileged server helpers", () => {
  const forbidden = [
    "@/lib/auth/current-user",
    "@/lib/auth/platform-admin",
    "@/lib/errors/server-error",
    "@/lib/supabase/admin",
    "@/lib/supabase/bootstrap",
    "@/lib/supabase/server",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const sourceFiles = filesUnder("src").filter((path) => /\.[cm]?[jt]sx?$/.test(path));

  for (const path of sourceFiles) {
    const source = read(path);

    if (!/^\s*["']use client["'];/m.test(source)) {
      continue;
    }

    for (const value of forbidden) {
      assert.doesNotMatch(source, new RegExp(value.replaceAll("/", "\\/")), path);
    }
  }
});

test("platform routes and actions call the separate platform-admin guard", () => {
  const guardedFiles = [
    "src/app/(admin)/super-admin/page.tsx",
    "src/app/(admin)/super-admin/audit-log/page.tsx",
    "src/app/(admin)/super-admin/connections/actions.ts",
    "src/app/(admin)/super-admin/connections/page.tsx",
    "src/app/(admin)/super-admin/platform-admins/actions.ts",
    "src/app/(admin)/super-admin/platform-admins/page.tsx",
    "src/app/(admin)/super-admin/schools/page.tsx",
    "src/app/(admin)/super-admin/schools/new/actions.ts",
    "src/app/(admin)/super-admin/schools/new/page.tsx",
    "src/app/(admin)/super-admin/schools/[schoolId]/actions.ts",
    "src/app/(admin)/super-admin/schools/[schoolId]/page.tsx",
  ];

  for (const path of guardedFiles) {
    assert.match(read(path), /requirePlatformAdmin\(\)/, path);
  }

  const platformHelper = read("src/lib/auth/platform-admin.ts");
  assert.match(platformHelper, /from\("platform_admins"\)/);
  assert.doesNotMatch(platformHelper, /role\s*===\s*["']super_admin["']/);
});

test("sensitive server actions perform their own identity or platform check", () => {
  const actionFiles = [
    "src/app/(admin)/announcements/actions.ts",
    "src/app/(admin)/approvals/actions.ts",
    "src/app/(admin)/club-requests/actions.ts",
    "src/app/(admin)/clubs/actions.ts",
    "src/app/(admin)/events/actions.ts",
    "src/app/(admin)/events/[eventId]/attendance/actions.ts",
    "src/app/(admin)/invite-codes/actions.ts",
    "src/app/(admin)/profile/actions.ts",
    "src/app/(admin)/school-connections/actions.ts",
    "src/app/(admin)/settings/actions.ts",
    "src/app/(admin)/staff/actions.ts",
    "src/app/(admin)/students/actions.ts",
    "src/app/(admin)/safety/actions.ts",
    "src/app/check-in/[eventId]/actions.ts",
  ];

  for (const path of actionFiles) {
    const source = read(path);
    assert.match(source, /^["']use server["'];/m, path);
    assert.match(
      source,
      /auth\.getUser\(\)|getCurrentEventActor\(\)|getCurrentProfile\(\)|getCurrentUser\(\)|requirePlatformAdmin\(\)|requireActiveSchoolProfile\(\)|requireSafeguardingStaff\(\)|requireSchoolAdminForSensitiveWorkflow\(\)/,
      path,
    );
  }
});

test("protected layout rejects logged-out users", () => {
  const layout = read("src/app/(admin)/layout.tsx");
  assert.match(layout, /const user = await getCurrentUser\(\)/);
  assert.match(layout, /if \(!user\)\s*{\s*redirect\("\/login"\)/s);
});

test("safe baseline security headers are configured without an untested CSP", () => {
  const config = read("next.config.ts");
  assert.match(config, /X-Content-Type-Options["'], value: ["']nosniff/);
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /Permissions-Policy/);
  assert.doesNotMatch(config, /Content-Security-Policy/);
});

test("protected navigation keeps automatic prefetch disabled", () => {
  const link = read("src/app/(admin)/_components/protected-app-link.tsx");
  const mobileNav = read("src/app/(admin)/_components/mobile-app-nav.tsx");
  const drawer = read("src/app/(admin)/_components/mobile-menu-drawer.tsx");

  assert.match(link, /prefetch={false}/);
  assert.match(link, /intentPrefetch = false/);
  assert.match(mobileNav, /{open \? \(/);
  assert.match(drawer, /open && typeof document !== ["']undefined["']/);
});

test("user-facing application code does not interpolate raw error messages", () => {
  const applicationFiles = filesUnder("src/app").filter((path) =>
    /\.[cm]?[jt]sx?$/.test(path),
  );

  for (const path of applicationFiles) {
    assert.doesNotMatch(read(path), /(?:error|Error)\.message/, path);
  }
});
