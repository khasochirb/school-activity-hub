"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type ActionMenuItem =
  | { hint?: string; href: string; label: string }
  | "divider";

// The draft's menus: "+ New" in a page head, and ⋯ on cards and rows, so
// secondary actions stay out of the way until asked for.
export function ActionMenu({
  buttonClassName,
  buttonLabel,
  items,
  label,
}: {
  buttonClassName?: string;
  /** Visible button text. Without it the button is a ⋯ icon. */
  buttonLabel?: ReactNode;
  items: ActionMenuItem[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="cl-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={buttonLabel ? undefined : label}
        className={buttonClassName ?? (buttonLabel ? "cl-btn-soft" : "cl-iconbtn")}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {buttonLabel ?? (
          <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
            <circle cx="5.5" cy="12" r="1.4" />
            <circle cx="12" cy="12" r="1.4" />
            <circle cx="18.5" cy="12" r="1.4" />
          </svg>
        )}
      </button>
      {open ? (
        <span aria-label={label} className="cl-menu-pop" id={menuId} role="menu">
          {items.map((item, index) =>
            item === "divider" ? (
              <hr key={`divider-${index}`} />
            ) : (
              <Link
                href={item.href}
                key={item.href + item.label}
                onClick={() => setOpen(false)}
                prefetch={false}
                role="menuitem"
              >
                <span>
                  {item.label}
                  {item.hint ? <small>{item.hint}</small> : null}
                </span>
              </Link>
            ),
          )}
        </span>
      ) : null}
    </span>
  );
}
