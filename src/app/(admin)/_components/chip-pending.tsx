"use client";

import { useLinkStatus } from "next/link";

// Sits inside a filter chip link. While the chip's page is loading, the chip
// takes the selected look at once, so a click is answered before the server is.
export function ChipPending() {
  const { pending } = useLinkStatus();

  return <span aria-hidden="true" className="chip-pending" data-pending={pending ? "true" : "false"} />;
}
