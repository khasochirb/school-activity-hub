"use client";

import { usePathname } from "next/navigation";
import { ProtectedAppLink } from "./protected-app-link";

export type StudentTab = {
  href: "/clubs" | "/dashboard" | "/events" | "/portfolio";
  label: string;
};

// Phone-only bottom navigation for students: the four places they return to.
// Everything else stays in the menu drawer.
export function StudentTabBar({
  label,
  tabs,
}: {
  label: string;
  tabs: StudentTab[];
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((tab) => {
          const active = isActiveTab(tab.href, pathname);

          return (
            <li className="min-w-0" key={tab.href}>
              <ProtectedAppLink
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[0.7rem] leading-tight [&>span:last-child]:absolute [&>span:last-child]:right-3 [&>span:last-child]:top-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--primary)]",
                  active
                    ? "font-extrabold text-[var(--primary-strong)]"
                    : "font-semibold text-slate-500",
                ].join(" ")}
                href={tab.href}
              >
                <TabIcon active={active} href={tab.href} />
                <span className="max-w-full truncate">{tab.label}</span>
              </ProtectedAppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function isActiveTab(href: StudentTab["href"], pathname: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabIcon({
  active,
  href,
}: {
  active: boolean;
  href: StudentTab["href"];
}) {
  const common = {
    "aria-hidden": true,
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: active ? 2.2 : 1.8,
    viewBox: "0 0 24 24",
  };

  if (href === "/dashboard") {
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h5v-6h4v6h5V9.5" />
      </svg>
    );
  }

  if (href === "/events") {
    return (
      <svg {...common}>
        <rect height="17" rx="2" width="18" x="3" y="4" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    );
  }

  if (href === "/clubs") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.5 5.2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect height="7" rx="2" width="7" x="3.5" y="3.5" />
      <rect height="7" rx="2" width="7" x="13.5" y="3.5" />
      <rect height="7" rx="2" width="7" x="3.5" y="13.5" />
      <rect height="7" rx="2" width="7" x="13.5" y="13.5" />
    </svg>
  );
}
