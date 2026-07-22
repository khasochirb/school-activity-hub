"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useRef } from "react";

export function PendingLinkIndicator({
  className = "",
}: {
  className?: string;
}) {
  const { pending } = useLinkStatus();
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pending) {
      return;
    }

    const link = indicatorRef.current?.closest("a");

    if (!link) {
      return;
    }

    const previousAriaBusy = link.getAttribute("aria-busy");
    const previousAriaDisabled = link.getAttribute("aria-disabled");
    const preventRepeatActivation = (event: MouseEvent) => {
      event.preventDefault();
    };

    link.setAttribute("aria-busy", "true");
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", preventRepeatActivation);

    return () => {
      if (previousAriaBusy === null) {
        link.removeAttribute("aria-busy");
      } else {
        link.setAttribute("aria-busy", previousAriaBusy);
      }

      if (previousAriaDisabled === null) {
        link.removeAttribute("aria-disabled");
      } else {
        link.setAttribute("aria-disabled", previousAriaDisabled);
      }

      link.removeEventListener("click", preventRepeatActivation);
    };
  }, [pending]);

  return (
    <span
      aria-hidden="true"
      className={`pending-link-indicator ${className}`.trim()}
      data-pending={pending ? "true" : "false"}
      ref={indicatorRef}
    >
      <span className="pending-link-spinner" />
    </span>
  );
}
