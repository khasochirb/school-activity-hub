"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const FORM_SECTION_EVENT = "sah:form-section-toggle";

type FormSectionEventDetail = {
  id: string;
  open?: boolean;
  scroll?: boolean;
  trigger?: HTMLElement;
};

type ButtonVariant = "primary" | "secondary";

export function CollapsibleFormSection({
  children,
  collapsedSummary = true,
  description,
  hideLabel,
  id,
  showLabel,
  title,
}: {
  children: React.ReactNode;
  collapsedSummary?: boolean;
  description: string;
  hideLabel: string;
  id: string;
  showLabel: string;
  title: string;
}) {
  const summaryId = `${id}-summary`;
  const contentId = `${id}-form`;
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const setOpen = useCallback(
    (nextOpen: boolean, options?: { scroll?: boolean }) => {
      setIsOpen(nextOpen);
      writeStoredOpenState(id, nextOpen);

      if (nextOpen && options?.scroll) {
        window.requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({
            block: "start",
            behavior: "smooth",
          });
        });
      }
    },
    [id],
  );

  useEffect(() => {
    function openFromHash() {
      if (!hashIncludesSectionId(window.location.hash, id)) {
        return;
      }

      setOpen(true, { scroll: true });
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    const frameId = window.requestAnimationFrame(() => {
      if (readStoredOpenState(id)) {
        setOpen(true);
      }

      openFromHash();
    });

    window.addEventListener("hashchange", openFromHash);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, [id, setOpen]);

  useEffect(() => {
    function handleToggle(event: Event) {
      const detail = (event as CustomEvent<FormSectionEventDetail>).detail;

      if (!detail || detail.id !== id) {
        return;
      }

      if (detail.trigger) {
        returnFocusRef.current = detail.trigger;
      }
      setOpen(detail.open ?? true, { scroll: detail.scroll ?? true });
    }

    window.addEventListener(FORM_SECTION_EVENT, handleToggle);

    return () => {
      window.removeEventListener(FORM_SECTION_EVENT, handleToggle);
    };
  }, [id, setOpen]);

  function collapseSection() {
    const focusTarget = collapsedSummary
      ? toggleButtonRef.current
      : returnFocusRef.current;

    if (
      !collapsedSummary ||
      contentRef.current?.contains(document.activeElement)
    ) {
      focusTarget?.focus();
    }

    setOpen(false);
  }

  const header = (
    <div
      className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
      id={summaryId}
    >
      <div className="max-w-xl">
        <h2 className="section-title">{title}</h2>
        <p className="section-description">{description}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:justify-end">
        <button
          aria-controls={contentId}
          aria-expanded={isOpen}
          className={`btn ${isOpen ? "btn-secondary" : "btn-primary"} w-full sm:w-auto`}
          onClick={() => (isOpen ? collapseSection() : setOpen(true))}
          ref={toggleButtonRef}
          type="button"
        >
          {isOpen ? hideLabel : showLabel}
        </button>
      </div>
    </div>
  );

  const animatedContent = (
    <div
      className="disclosure-motion"
      data-open={isOpen ? "true" : "false"}
    >
      <div
        aria-hidden={!isOpen}
        className="disclosure-motion-inner"
        id={contentId}
        inert={!isOpen}
        ref={contentRef}
      >
        <div className="collapsible-form-content mt-3">{children}</div>
      </div>
    </div>
  );

  if (collapsedSummary) {
    return (
      <section
        aria-labelledby={summaryId}
        className="collapsible-form-section section-card section-card-padded"
        id={id}
      >
        {header}
        {animatedContent}
      </section>
    );
  }

  return (
    <div
      className="collapsible-section-shell disclosure-motion"
      data-open={isOpen ? "true" : "false"}
      id={id}
    >
      <div
        aria-hidden={!isOpen}
        className="disclosure-motion-inner"
        inert={!isOpen}
      >
        <section
          aria-labelledby={summaryId}
          className="collapsible-form-section section-card section-card-padded"
        >
          {header}
          <div className="collapsible-form-content mt-3" id={contentId} ref={contentRef}>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

export function FormSectionToggleButton({
  children,
  targetId,
  variant = "primary",
}: {
  children: React.ReactNode;
  targetId: string;
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={`btn ${variant === "primary" ? "btn-primary" : "btn-secondary"} w-full sm:w-auto`}
      onClick={(event) => openFormSection(targetId, event.currentTarget)}
      type="button"
    >
      {children}
    </button>
  );
}

function openFormSection(id: string, trigger: HTMLElement) {
  window.dispatchEvent(
    new CustomEvent<FormSectionEventDetail>(FORM_SECTION_EVENT, {
      detail: { id, open: true, scroll: true, trigger },
    }),
  );
}

function storageKey(id: string) {
  return `sah:form-section:${id}:open`;
}

function readStoredOpenState(id: string) {
  try {
    return window.localStorage.getItem(storageKey(id)) === "true";
  } catch {
    return false;
  }
}

function writeStoredOpenState(id: string, isOpen: boolean) {
  try {
    window.localStorage.setItem(storageKey(id), isOpen ? "true" : "false");
  } catch {
    // Ignore storage failures; the visible state has already updated.
  }
}

function hashIncludesSectionId(hash: string, id: string) {
  return hash
    .split("#")
    .map((part) => safeDecode(part))
    .filter(Boolean)
    .includes(id);
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
