"use client";

import { usePathname } from "next/navigation";
import { ProtectedAppLink } from "./protected-app-link";

export type TopTab = {
  exact?: boolean;
  href: string;
  icon: "approvals" | "audit" | "clubs" | "events" | "home" | "portfolio" | "schools" | "students";
  label: string;
};

// The four places each role returns to most. Everything else lives in the
// "More" menu, so the bar stays short.
export function TopTabs({ label, tabs }: { label: string; tabs: TopTab[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="top-tabs">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <ProtectedAppLink
            aria-current={active ? "page" : undefined}
            className="top-tab"
            href={tab.href}
            key={tab.href}
          >
            <TabIcon name={tab.icon} />
            <span>{tab.label}</span>
          </ProtectedAppLink>
        );
      })}
    </nav>
  );
}

export function TabIcon({ name }: { name: TopTab["icon"] }) {
  const common = {
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3.5 11 12 4l8.5 7" />
          <path d="M5.5 9.5V20h13V9.5" />
        </svg>
      );
    case "events":
      return (
        <svg {...common}>
          <rect height="15.5" rx="3" width="17" x="3.5" y="5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      );
    case "clubs":
    case "students":
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3.5" />
          <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
          <circle cx="17" cy="7" r="2.6" />
          <path d="M17.5 12.6c2.2.4 3.6 2 4 4.4" />
        </svg>
      );
    case "portfolio":
      return (
        <svg {...common}>
          <rect height="7" rx="2" width="7" x="3.5" y="3.5" />
          <rect height="7" rx="2" width="7" x="13.5" y="3.5" />
          <rect height="7" rx="2" width="7" x="3.5" y="13.5" />
          <rect height="7" rx="2" width="7" x="13.5" y="13.5" />
        </svg>
      );
    case "approvals":
      return (
        <svg {...common}>
          <path d="M3.5 13.5 6 5.5h12l2.5 8v5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
          <path d="M3.5 13.5h5l1 2.5h5l1-2.5h5" />
        </svg>
      );
    case "schools":
      return (
        <svg {...common}>
          <path d="M3 9l9-5 9 5-9 5z" />
          <path d="M7 11.2V16c1.3 1.3 3 2 5 2s3.7-.7 5-2v-4.8" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.5" cy="6" r="1" />
          <circle cx="4.5" cy="12" r="1" />
          <circle cx="4.5" cy="18" r="1" />
        </svg>
      );
  }
}
