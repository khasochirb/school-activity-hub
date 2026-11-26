"use client";

import { usePathname } from "next/navigation";
import { ProtectedAppLink } from "./protected-app-link";

export type NavItem = {
  href: string;
  intentPrefetch: boolean;
  label: string;
};

export type NavSection = {
  items: NavItem[];
  label: string;
};

// The sidebar: a short list of the places each role uses every day, then
// everything else folded under "More". When the sidebar is collapsed to a rail,
// only the main icons show.
export function AppNav({
  ariaLabel,
  moreLabel,
  moreSections,
  primaryItems,
}: {
  ariaLabel: string;
  moreLabel: string;
  moreSections: NavSection[];
  primaryItems: NavItem[];
}) {
  const pathname = usePathname();
  const moreHasActive = moreSections.some((section) =>
    section.items.some((item) => isActivePath(pathname, item.href)),
  );

  return (
    <nav
      aria-label={ariaLabel}
      className="flex min-w-0 max-w-full flex-col gap-3 overflow-hidden"
    >
      <div className="flex min-w-0 max-w-full flex-col gap-0.5">
        {primaryItems.map((item) => (
          <NavLink item={item} key={item.href} pathname={pathname} withIcon />
        ))}
      </div>

      {moreSections.length ? (
        <details className="nav-more group min-w-0" open={moreHasActive}>
          <summary className="nav-link nav-link-muted cursor-pointer list-none">
            <NavIcon href="more" />
            <span className="nav-label min-w-0 flex-1 leading-snug">{moreLabel}</span>
            <svg
              aria-hidden="true"
              className="nav-label h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="mt-2 flex min-w-0 flex-col gap-3 pl-2">
            {moreSections.map((section) => (
              <section className="min-w-0 max-w-full space-y-0.5" key={section.label}>
                <h2 className="max-w-full break-words px-3 pb-1 text-xs font-semibold leading-snug text-slate-500">
                  {section.label}
                </h2>
                {section.items.map((item) => (
                  <NavLink item={item} key={item.href} pathname={pathname} />
                ))}
              </section>
            ))}
          </div>
        </details>
      ) : null}
    </nav>
  );
}

function NavLink({
  item,
  pathname,
  withIcon = false,
}: {
  item: NavItem;
  pathname: string;
  withIcon?: boolean;
}) {
  const active = isActivePath(pathname, item.href);

  return (
    <ProtectedAppLink
      aria-current={active ? "page" : undefined}
      className={active ? "nav-link nav-link-active" : "nav-link nav-link-muted"}
      href={item.href}
      intentPrefetch={!active && item.intentPrefetch}
      title={item.label}
    >
      {withIcon ? <NavIcon href={item.href} /> : null}
      <span className="nav-label min-w-0 max-w-full break-words leading-snug">
        {item.label}
      </span>
    </ProtectedAppLink>
  );
}

const ICON_PATHS: Record<string, string[]> = {
  "/dashboard": ["M3 10.5 12 3l9 7.5", "M5 9.5V20h5v-6h4v6h5V9.5"],
  "/events": ["M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M3 9h18M8 2v4M16 2v4"],
  "/clubs": [
    "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    "M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5",
    "M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2",
  ],
  "/students": ["M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M9 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM5.8 16c.5-1.8 1.7-2.8 3.2-2.8s2.7 1 3.2 2.8M14.5 9h4M14.5 13h4"],
  "/approvals": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "m8 12 3 3 5-6"],
  "/reports": ["M4 20V10M10 20V4M16 20v-7M22 20H2"],
  "/portfolio": ["M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"],
  "/club-requests": ["M9 18h6M10 21h4", "M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"],
  "/super-admin": ["M12 3 4 6v6c0 4.4 3.4 8.1 8 9 4.6-.9 8-4.6 8-9V6z"],
  more: ["M5 12h.01M12 12h.01M19 12h.01"],
};

function NavIcon({ href }: { href: string }) {
  const paths = ICON_PATHS[href] ?? ["M12 12h.01"];

  return (
    <svg
      aria-hidden="true"
      className="nav-icon h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={href === "more" ? 3 : 1.8}
      viewBox="0 0 24 24"
    >
      {paths.map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  if (href === "/super-admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
