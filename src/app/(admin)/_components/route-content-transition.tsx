"use client";

import { usePathname } from "next/navigation";

export function RouteContentTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div
      className={pathname === "/dashboard" ? "dashboard-route-content" : "route-content-enter"}
      key={pathname}
    >
      {children}
    </div>
  );
}
