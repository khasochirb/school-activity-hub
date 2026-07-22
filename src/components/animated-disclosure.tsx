"use client";

import { useId, useRef, useState } from "react";

export function AnimatedDisclosure({
  children,
  className = "",
  contentClassName = "details-content",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  function toggleDisclosure() {
    if (
      isOpen &&
      contentRef.current?.contains(document.activeElement)
    ) {
      buttonRef.current?.focus();
    }

    setIsOpen((current) => !current);
  }

  return (
    <section
      className={`details-panel ${className}`.trim()}
      data-open={isOpen ? "true" : "false"}
    >
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="details-summary flex w-full items-center justify-between gap-3 border-0 bg-transparent text-left"
        onClick={toggleDisclosure}
        ref={buttonRef}
        type="button"
      >
        <span className="min-w-0 break-words">{label}</span>
        <span
          aria-hidden="true"
          className={`motion-rotate shrink-0 text-lg leading-none ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
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
          <div className={contentClassName}>{children}</div>
        </div>
      </div>
    </section>
  );
}
