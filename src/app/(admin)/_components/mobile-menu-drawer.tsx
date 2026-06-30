"use client";

import { usePathname } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect, useId, useState } from "react";

export function MobileMenuDrawer({
  children,
  closeLabel,
  menuLabel,
}: {
  children: ReactNode;
  closeLabel: string;
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;
    const previousHtmlOverflow = html.style.overflow;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      html.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleContentClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a[href]")) {
      setOpen(false);
    }
  }

  return (
    <div className="shrink-0 lg:hidden">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="btn btn-secondary px-3"
        onClick={() => setOpen(true)}
        type="button"
      >
        {menuLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label={closeLabel}
            className="absolute inset-0 cursor-pointer bg-slate-950/45 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            type="button"
          />
          <aside
            aria-label={menuLabel}
            aria-modal="true"
            className="fixed inset-y-0 left-0 z-50 flex h-dvh w-[min(20rem,90vw)] max-w-full min-w-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl"
            id={panelId}
            role="dialog"
          >
            <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <p className="min-w-0 break-words text-sm font-bold leading-snug text-slate-950">
                {menuLabel}
              </p>
              <button
                className="btn btn-secondary min-h-9 shrink-0 px-3 py-1.5"
                onClick={() => setOpen(false)}
                type="button"
              >
                {closeLabel}
              </button>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 [-webkit-overflow-scrolling:touch]"
              onClick={handleContentClick}
            >
              {children}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
