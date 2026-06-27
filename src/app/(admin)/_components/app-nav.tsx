"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
};

export type NavSection = {
  items: NavItem[];
  label: string;
};

export function AppNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="flex flex-col gap-5"
    >
      {sections.map((section) => {
        if (!section.items.length) {
          return null;
        }

        return (
          <section className="space-y-2" key={section.label}>
            <h2 className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              {section.label}
            </h2>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "flex min-h-10 cursor-pointer items-center rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-950 shadow-sm transition hover:bg-teal-100"
                        : "flex min-h-10 cursor-pointer items-center rounded-md border border-transparent px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-200 hover:bg-white hover:text-slate-950"
                    }
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
