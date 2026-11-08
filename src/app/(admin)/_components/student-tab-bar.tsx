"use client";

import { usePathname } from "next/navigation";
import { ProtectedAppLink } from "./protected-app-link";

export type StudentTab = {
  href: "/clubs" | "/dashboard" | "/events" | "/profile" | "/students";
  label: string;
};

// Phone-only bottom navigation: the four places a student (or staff member)
// returns to, as a floating bar. Everything else stays in the menu drawer.
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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden"
    >
      <ul className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.4rem] border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.16)] backdrop-blur">
        {tabs.map((tab) => {
          const active = isActiveTab(tab.href, pathname);

          return (
            <li className="min-w-0" key={tab.href}>
              <ProtectedAppLink
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[0.7rem] leading-tight transition-colors [&>span:last-child]:absolute [&>span:last-child]:right-3 [&>span:last-child]:top-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--primary)]",
                  active
                    ? "bg-[var(--primary-soft)] font-extrabold text-[var(--primary-strong)]"
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

  if (href === "/students") {
    return (
      <svg {...common}>
        <rect height="16" rx="2" width="18" x="3" y="4" />
        <circle cx="9" cy="10" r="2.2" />
        <path d="M5.8 16c.5-1.8 1.7-2.8 3.2-2.8s2.7 1 3.2 2.8M14.5 9h4M14.5 13h4" />
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" />
    </svg>
  );
}
