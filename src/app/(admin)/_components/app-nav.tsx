"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
};

export function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
    >
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-3 text-center text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
                : "inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-center text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950"
            }
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
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
