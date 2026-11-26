"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Marks the page you are on. The overview sits at the root of every other
// console address, so it matches exactly.
export function ConsoleNavLink({ children, href }: { children: ReactNode; href: string }) {
  const pathname = usePathname();
  const current =
    href === "/super-admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link aria-current={current ? "page" : undefined} href={href} prefetch={false}>
      {children}
    </Link>
  );
}
