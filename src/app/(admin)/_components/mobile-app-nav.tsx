"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { ProtectedAppLink } from "./protected-app-link";

export type MobileNavMatch = "attendance" | "calendar" | "default" | "events";

export type MobileNavItem = {
  href: string;
  intentPrefetch: boolean;
  label: string;
  match?: MobileNavMatch;
};

export type MobileNavGroup = {
  id: string;
  items: MobileNavItem[];
  label: string;
};

export function MobileAppNav({
  groups,
  label,
  primaryItems,
}: {
  groups: MobileNavGroup[];
  label: string;
  primaryItems: MobileNavItem[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const componentId = useId();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      groups.map((group) => [
        group.id,
        group.items.some((item) =>
          isActiveItem(item, pathname, searchParams),
        ),
      ]),
    ),
  );

  return (
    <nav aria-label={label} className="min-w-0 max-w-full">
      <div className="grid min-w-0 gap-px">
        {primaryItems.map((item) => (
          <MobileNavLink
            active={isActiveItem(item, pathname, searchParams)}
            item={item}
            key={`${item.href}-${item.label}`}
          />
        ))}
      </div>

      {groups.length ? (
        <div className="mt-4 grid min-w-0 gap-1 border-t border-[var(--border)] pt-3">
          {groups.map((group) => {
            const open = Boolean(openGroups[group.id]);
            const contentId = `${componentId}-${group.id}`.replace(/:/g, "");

            return (
              <section className="min-w-0" key={group.id}>
                <button
                  aria-controls={contentId}
                  aria-expanded={open}
                  className="drawer-group nav-link-motion flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-md px-2.5 text-left"
                  onClick={() =>
                    setOpenGroups((current) => ({
                      ...current,
                      [group.id]: !open,
                    }))
                  }
                  type="button"
                >
                  <span className="min-w-0 break-words">{group.label}</span>
                  <svg
                    aria-hidden="true"
                    className={`motion-rotate h-3.5 w-3.5 shrink-0 ${open ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <div
                  className="disclosure-motion"
                  data-open={open ? "true" : "false"}
                >
                  <div
                    aria-hidden={!open}
                    className="disclosure-motion-inner"
                    id={contentId}
                    inert={!open}
                  >
                    <div className="mt-px grid min-w-0 gap-px">
                      {group.items.map((item) => (
                        <MobileNavLink
                          active={isActiveItem(item, pathname, searchParams)}
                          item={item}
                          key={`${item.href}-${item.label}`}
                          secondary
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </nav>
  );
}

function MobileNavLink({
  active,
  item,
  secondary = false,
}: {
  active: boolean;
  item: MobileNavItem;
  secondary?: boolean;
}) {
  return (
    <ProtectedAppLink
      aria-current={active ? "page" : undefined}
      className={["drawer-row nav-link-motion", secondary ? "drawer-row-secondary" : ""].join(" ")}
      href={item.href}
      intentPrefetch={!active && item.intentPrefetch}
      title={item.label}
    >
      {active ? <span aria-hidden="true" className="drawer-indicator" /> : null}
      <NavIcon href={item.href} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </ProtectedAppLink>
  );
}

// Pulse-style rows: a muted line icon, a quiet label, and a soft fill with an
// accent bar for the current page.
const ICON_PATHS: Record<string, string[]> = {
  "/dashboard": ["M3 10.5 12 3l9 7.5", "M5 9.5V20h5v-6h4v6h5V9.5"],
  "/events": ["M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M3 9h18M8 2v4M16 2v4"],
  "/clubs": ["M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", "M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5", "M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2"],
  "/students": ["M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M9 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM5.8 16c.5-1.8 1.7-2.8 3.2-2.8s2.7 1 3.2 2.8M14.5 9h4M14.5 13h4"],
  "/staff": ["M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21c.8-4 4-6 8-6s7.2 2 8 6"],
  "/approvals": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "m8 12 3 3 5-6"],
  "/reports": ["M4 20V10M10 20V4M16 20v-7M22 20H2"],
  "/portfolio": ["M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"],
  "/club-requests": ["M9 18h6M10 21h4", "M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"],
  "/announcements": ["M4 10v4a1 1 0 0 0 1 1h3l5 4V5L8 9H5a1 1 0 0 0-1 1z", "M17 9a4 4 0 0 1 0 6"],
  "/news": ["M5 4h11a2 2 0 0 1 2 2v13a1 1 0 0 0 2 0V8", "M5 4a1 1 0 0 0-1 1v13a2 2 0 0 0 2 2h13", "M8 8h6M8 12h6M8 16h4"],
  "/safety": ["M12 3 4 6v6c0 4.4 3.4 8.1 8 9 4.6-.9 8-4.6 8-9V6z"],
  "/invite-codes": ["M15 7a4 4 0 1 0-3.9 5L4 19v2h3l1-1v-2h2v-2h2l1.1-1.1A4 4 0 0 0 15 7z"],
  "/settings": ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
  "/school-connections": ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  "/privacy": ["M6 11V8a6 6 0 1 1 12 0v3", "M5 11h14v10H5z"],
};

function NavIcon({ href }: { href: string }) {
  const path = href.split("?")[0];
  const paths = ICON_PATHS[path] ?? ICON_PATHS[`/${path.split("/")[1]}`] ?? ["M12 12h.01"];

  return (
    <svg
      aria-hidden="true"
      className="drawer-icon h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      {paths.map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

function isActiveItem(
  item: MobileNavItem,
  pathname: string,
  searchParams: Pick<URLSearchParams, "get">,
) {
  const view = searchParams.get("view");
  const focus = searchParams.get("focus");

  if (item.match === "calendar") {
    return pathname === "/events" && (view === "month" || view === "week");
  }

  if (item.match === "attendance") {
    return (
      pathname.endsWith("/attendance") ||
      (pathname === "/events" && focus === "attendance")
    );
  }

  if (item.match === "events") {
    return (
      (pathname === "/events" ||
        (pathname.startsWith("/events/") && !pathname.endsWith("/attendance"))) &&
      view !== "month" &&
      view !== "week" &&
      focus !== "attendance"
    );
  }

  const itemPath = item.href.split("?")[0];

  if (itemPath === "/dashboard" || itemPath === "/super-admin") {
    return pathname === itemPath;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
