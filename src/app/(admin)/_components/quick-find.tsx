"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

export type QuickFindTarget = {
  href: string;
  label: string;
};

// One search box for the whole app. Typing then choosing a place opens that
// page's own search with the words already filled in.
export function QuickFind({
  closeLabel,
  label,
  placeholder,
  targets,
}: {
  closeLabel: string;
  label: string;
  placeholder: string;
  targets: QuickFindTarget[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  function open() {
    dialogRef.current?.showModal();
    window.setTimeout(() => inputRef.current?.focus(), 20);
  }

  function go(href: string) {
    const words = query.trim();
    dialogRef.current?.close();
    router.push(words ? `${href}?q=${encodeURIComponent(words)}` : href);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (targets[0]) go(targets[0].href);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName ?? "";

      if (event.key === "/" && !/input|textarea|select/i.test(tag)) {
        event.preventDefault();
        open();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!targets.length) return null;

  return (
    <>
      <button className="topbar-find" onClick={open} type="button">
        <SearchIcon />
        <span>{label}</span>
        <kbd>/</kbd>
      </button>
      <dialog
        aria-label={label}
        className="quick-find"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        ref={dialogRef}
      >
        <form className="quick-find-body" onSubmit={onSubmit}>
          <label className="cl-search cl-search-wide">
            <SearchIcon />
            <span className="sr-only">{label}</span>
            <input
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              ref={inputRef}
              value={query}
            />
          </label>
          <div className="cl-rows">
            {targets.map((target) => (
              <button
                className="cl-row cl-row-button"
                key={target.href}
                onClick={() => go(target.href)}
                type="button"
              >
                <span className="cl-grow cl-row-title">{target.label}</span>
                <ChevronIcon />
              </button>
            ))}
          </div>
          <button
            className="btn btn-quiet self-end"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            {closeLabel}
          </button>
        </form>
      </dialog>
    </>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
