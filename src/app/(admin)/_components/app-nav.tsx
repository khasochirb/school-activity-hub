"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  prefetch: boolean | null;
};

export type NavSection = {
  items: NavItem[];
  label: string;
};

export function AppNav({
  ariaLabel,
  sections,
}: {
  ariaLabel?: string;
  sections: NavSection[];
}) {
  const pathname = usePathname();
  const navigationLabel =
    ariaLabel ||
    sections
      .map((section) => section.label)
      .filter(Boolean)
      .join(", ");

  return (
    <nav
      aria-label={navigationLabel}
      className="flex min-w-0 max-w-full flex-col gap-7 overflow-hidden"
    >
      {sections.map((section) => {
        if (!section.items.length) {
          return null;
        }

        return (
          <section className="min-w-0 max-w-full space-y-3" key={section.label}>
            <h2 className="max-w-full break-words px-3 text-[0.68rem] font-bold uppercase leading-snug tracking-[0.16em] text-slate-400">
              {section.label}
            </h2>
            <div className="flex min-w-0 max-w-full flex-col gap-2">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={
                      active ? "nav-link nav-link-active" : "nav-link nav-link-muted"
                    }
                    href={item.href}
                    key={item.href}
                    prefetch={active ? false : item.prefetch}
                    title={item.label}
                  >
                    <span className="min-w-0 max-w-full break-words leading-snug">
                      {item.label}
                    </span>
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

  if (href === "/super-admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
