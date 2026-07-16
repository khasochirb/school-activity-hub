"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

export type MobileNavMatch = "attendance" | "calendar" | "default" | "events";

export type MobileNavItem = {
  href: string;
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
      <div className="grid min-w-0 gap-1.5">
        {primaryItems.map((item) => (
          <MobileNavLink
            active={isActiveItem(item, pathname, searchParams)}
            item={item}
            key={`${item.href}-${item.label}`}
          />
        ))}
      </div>

      {groups.length ? (
        <div className="mt-5 grid min-w-0 gap-2 border-t border-slate-200 pt-4">
          {groups.map((group) => {
            const open = Boolean(openGroups[group.id]);
            const contentId = `${componentId}-${group.id}`.replace(/:/g, "");

            return (
              <section className="min-w-0" key={group.id}>
                <button
                  aria-controls={contentId}
                  aria-expanded={open}
                  className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs font-extrabold uppercase leading-snug tracking-[0.12em] text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  onClick={() =>
                    setOpenGroups((current) => ({
                      ...current,
                      [group.id]: !open,
                    }))
                  }
                  type="button"
                >
                  <span className="min-w-0 break-words">{group.label}</span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-base transition-transform duration-150 ${
                      open ? "rotate-180" : ""
                    }`}
                  >
                    &#8964;
                  </span>
                </button>
                {open ? (
                  <div className="mt-1 grid min-w-0 gap-1.5 pl-2" id={contentId}>
                    {group.items.map((item) => (
                      <MobileNavLink
                        active={isActiveItem(item, pathname, searchParams)}
                        item={item}
                        key={`${item.href}-${item.label}`}
                        secondary
                      />
                    ))}
                  </div>
                ) : null}
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
    <Link
      aria-current={active ? "page" : undefined}
      className={[
        "flex min-h-12 min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-sm leading-snug transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2af68]",
        secondary ? "ml-1" : "",
        active
          ? "border-[#f2af68]/60 bg-[var(--primary-soft)] font-extrabold text-slate-950 shadow-sm"
          : "border-transparent font-bold text-slate-700 hover:border-[var(--border)] hover:bg-[var(--card-soft)] hover:text-slate-950",
      ].join(" ")}
      href={item.href}
      title={item.label}
    >
      <span
        aria-hidden="true"
        className={[
          "h-2 w-2 shrink-0 rounded-full border",
          active
            ? "border-[#f2af68] bg-[#f2af68]"
            : "border-slate-300 bg-transparent",
        ].join(" ")}
      />
      <span className="min-w-0 max-w-full break-words">{item.label}</span>
    </Link>
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
