"use client";

import {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function MobileMenuDrawer({
  children,
  closeLabel,
  header,
  menuLabel,
}: {
  children: ReactNode;
  closeLabel: string;
  header: ReactNode;
  menuLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const previousStyles = {
      bodyLeft: body.style.left,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
      bodyPosition: body.style.position,
      bodyRight: body.style.right,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
    };
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute("hidden"));

      if (!focusableElements.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1) ?? firstElement;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", closeDrawer);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", closeDrawer);
      body.style.left = previousStyles.bodyLeft;
      body.style.overflow = previousStyles.bodyOverflow;
      body.style.paddingRight = previousStyles.bodyPaddingRight;
      body.style.position = previousStyles.bodyPosition;
      body.style.right = previousStyles.bodyRight;
      body.style.top = previousStyles.bodyTop;
      body.style.width = previousStyles.bodyWidth;
      html.style.overflow = previousStyles.htmlOverflow;
      html.style.overscrollBehavior = previousStyles.htmlOverscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [closeDrawer, open]);

  function handleContentClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a[href]")) {
      closeDrawer();
    }
  }

  const drawer =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[80] lg:hidden">
            <button
              aria-label={closeLabel}
              className="mobile-drawer-backdrop absolute inset-0 cursor-pointer bg-slate-950/55"
              onClick={closeDrawer}
              type="button"
            />
            <aside
              aria-label={menuLabel}
              aria-modal="true"
              className="mobile-drawer-panel fixed inset-y-0 right-0 z-[90] flex h-dvh max-h-dvh w-[min(22rem,92vw)] max-w-full min-w-0 touch-pan-y flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
              id={panelId}
              ref={panelRef}
              role="dialog"
              tabIndex={-1}
            >
              <div className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <div className="min-w-0 flex-1">{header}</div>
                <button
                  aria-label={closeLabel}
                  className="btn btn-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 text-xl leading-none"
                  onClick={closeDrawer}
                  ref={closeButtonRef}
                  type="button"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 [-webkit-overflow-scrolling:touch]"
                onClick={handleContentClick}
              >
                {children}
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="shrink-0 lg:hidden">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={menuLabel}
        className="btn btn-secondary min-h-11 gap-2 px-3"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="grid w-4 gap-1">
          <span className="h-0.5 rounded-full bg-current" />
          <span className="h-0.5 rounded-full bg-current" />
          <span className="h-0.5 rounded-full bg-current" />
        </span>
        <span className="hidden text-sm font-bold min-[360px]:inline">
          {menuLabel}
        </span>
      </button>
      {drawer}
    </div>
  );
}
