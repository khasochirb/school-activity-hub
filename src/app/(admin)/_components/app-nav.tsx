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
      className="flex min-w-0 max-w-full flex-col gap-5 overflow-hidden"
    >
      {sections.map((section) => {
        if (!section.items.length) {
          return null;
        }

        return (
          <section className="min-w-0 max-w-full space-y-1" key={section.label}>
            <h2 className="max-w-full break-words px-3 pb-1 text-xs font-semibold leading-snug text-slate-500">
              {section.label}
            </h2>
            <div className="flex min-w-0 max-w-full flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <ProtectedAppLink
                    aria-current={active ? "page" : undefined}
                    className={
                      active ? "nav-link nav-link-active" : "nav-link nav-link-muted"
                    }
                    href={item.href}
                    intentPrefetch={!active && item.intentPrefetch}
                    key={item.href}
                    title={item.label}
                  >
                    <span className="min-w-0 max-w-full break-words leading-snug">
                      {item.label}
                    </span>
                  </ProtectedAppLink>
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
