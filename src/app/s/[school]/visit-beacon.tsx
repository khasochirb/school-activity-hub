"use client";

import { useEffect } from "react";

// Counts one visit when a page of the school site is opened. No cookie and no
// identifier: the request carries only the school and the page.
export function VisitBeacon({ page, school }: { page?: string; school: string }) {
  useEffect(() => {
    const url = `/s/${encodeURIComponent(school)}/visit${page ? `?page=${encodeURIComponent(page)}` : ""}`;

    if (!navigator.sendBeacon?.(url)) {
      void fetch(url, { credentials: "omit", keepalive: true, method: "POST" }).catch(() => undefined);
    }
  }, [page, school]);

  return null;
}
