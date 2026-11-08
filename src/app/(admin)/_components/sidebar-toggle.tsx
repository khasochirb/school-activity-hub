"use client";

import { useState } from "react";
import { SIDEBAR_COOKIE } from "@/lib/ui/sidebar-cookie";

// Collapses the desktop sidebar to an icon rail and back. The choice is kept in
// a cookie, so the server renders the right width on the next page load.
export function SidebarToggle({
  initiallyCollapsed,
  label,
}: {
  initiallyCollapsed: boolean;
  label: string;
}) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next = !collapsed;
    const shell = event.currentTarget.closest<HTMLElement>(".app-surface");

    setCollapsed(next);
    shell?.setAttribute("data-sidebar", next ? "collapsed" : "expanded");
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      aria-expanded={!collapsed}
      aria-label={label}
      className="sidebar-toggle grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      onClick={toggle}
      title={label}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <rect height="16" rx="2" width="18" x="3" y="4" />
        <path d="M9 4v16" />
      </svg>
    </button>
  );
}
