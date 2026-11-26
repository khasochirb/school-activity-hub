"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type DetailTab = {
  content: ReactNode;
  id: string;
  label: string;
};

// Tabs for detail pages: details are shown when asked for, instead of a long
// stack of sections. The open tab is kept in the URL hash so links and the
// back button land on the same tab.
export function DetailTabs({ label, tabs }: { label: string; tabs: DetailTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);

    if (tabs.some((tab) => tab.id === fromHash)) {
      // Reading the hash is only possible after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(fromHash);
    }
  }, [tabs]);

  function select(id: string, focus = false) {
    setActive(id);
    window.history.replaceState(window.history.state, "", `#${id}`);

    if (focus) {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${id}"]`)?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];

    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === active);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === "ArrowRight"
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length;

    select(tabs[next].id, true);
  }

  return (
    <div className="detail-tabs">
      <div
        aria-label={label}
        className="detail-tab-list"
        onKeyDown={onKeyDown}
        ref={listRef}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            aria-controls={`${baseId}-${tab.id}-panel`}
            aria-selected={active === tab.id}
            className="detail-tab"
            data-tab={tab.id}
            id={`${baseId}-${tab.id}-tab`}
            key={tab.id}
            onClick={() => select(tab.id)}
            role="tab"
            tabIndex={active === tab.id ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          aria-labelledby={`${baseId}-${tab.id}-tab`}
          className="detail-tab-panel"
          hidden={active !== tab.id}
          id={`${baseId}-${tab.id}-panel`}
          key={tab.id}
          role="tabpanel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
