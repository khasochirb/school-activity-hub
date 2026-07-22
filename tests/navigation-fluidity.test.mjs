import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");

test("protected links expose local pending feedback without changing prefetch", () => {
  const protectedLink = read(
    "src/app/(admin)/_components/protected-app-link.tsx",
  );
  const indicator = read("src/components/pending-link-indicator.tsx");

  assert.match(protectedLink, /prefetch={false}/);
  assert.match(protectedLink, /<PendingLinkIndicator\s*\/>/);
  assert.match(indicator, /useLinkStatus/);
  assert.match(indicator, /aria-busy/);
  assert.match(indicator, /preventRepeatActivation/);
});

test("authenticated loading boundaries share destination-shaped skeletons", () => {
  const shared = read(
    "src/app/(admin)/_components/page-loading-skeleton.tsx",
  );
  const rootLoading = read("src/app/(admin)/loading.tsx");
  const dashboardLoading = read("src/app/(admin)/dashboard/loading.tsx");
  const eventsLoading = read("src/app/(admin)/events/loading.tsx");

  assert.match(shared, /variant\?: SkeletonVariant/);
  assert.match(shared, /PageHeadingSkeleton/);
  assert.match(shared, /FilterControlsSkeleton/);
  assert.match(shared, /ListAreaSkeleton/);
  assert.match(rootLoading, /<PageLoadingSkeleton\s*\/>/);
  assert.match(dashboardLoading, /variant="dashboard"/);
  assert.match(eventsLoading, /variant="events"/);
});

test("route entrance and loading shimmer reuse motion tokens with reduced motion", () => {
  const css = read("src/app/globals.css");
  const shell = read("src/app/(admin)/_components/app-shell.tsx");
  const transition = read(
    "src/app/(admin)/_components/route-content-transition.tsx",
  );
  const reducedMotion = css.slice(
    css.lastIndexOf("@media (prefers-reduced-motion: reduce)"),
  );

  assert.match(shell, /<RouteContentTransition>{children}<\/RouteContentTransition>/);
  assert.match(transition, /key={pathname}/);
  assert.match(css, /animation: route-content-enter var\(--motion-normal\) var\(--motion-ease-out\)/);
  assert.match(css, /animation: route-loading-reveal 1ms linear var\(--motion-fast\)/);
  assert.match(reducedMotion, /\.route-content-enter/);
  assert.match(reducedMotion, /\.skeleton-block::after/);
});

test("mobile drawer starts navigation while a bounded exit animation runs", () => {
  const drawer = read(
    "src/app/(admin)/_components/mobile-menu-drawer.tsx",
  );

  assert.match(drawer, /const DRAWER_EXIT_MS = 240/);
  assert.match(drawer, /closeDrawer\(false\)/);
  assert.match(drawer, /mobile-drawer-panel-closing/);
  assert.doesNotMatch(drawer, /preventDefault\(\)[\s\S]{0,120}closest\("a\[href\]"\)/);
});
