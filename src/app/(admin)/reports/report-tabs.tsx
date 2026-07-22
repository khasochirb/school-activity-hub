"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type ReportTab = "activities" | "overview" | "students";

const TAB_ORDER: ReportTab[] = ["overview", "activities", "students"];
const REPORT_TAB_EVENT = "sah:report-tab";

export function ReportTabs({
  activities,
  initialTab,
  labels,
  overview,
  students,
}: {
  activities: ReactNode;
  initialTab: ReportTab;
  labels: Record<ReportTab, string>;
  overview: ReactNode;
  students: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabListRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const selectTab = useCallback((tab: ReportTab) => {
    setActiveTab(tab);
    const hiddenInput = document.querySelector<HTMLInputElement>(
      'input[name="tab"][data-report-tab-input="true"]',
    );
    if (hiddenInput) {
      hiddenInput.value = tab;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
  }, []);

  useEffect(() => {
    function handleTabRequest(event: Event) {
      const tab = (event as CustomEvent<ReportTab>).detail;
      if (TAB_ORDER.includes(tab)) {
        selectTab(tab);
        window.requestAnimationFrame(() => {
          tabListRef.current
            ?.querySelector<HTMLButtonElement>(`[data-report-tab="${tab}"]`)
            ?.focus();
        });
      }
    }

    window.addEventListener(REPORT_TAB_EVENT, handleTabRequest);
    return () => window.removeEventListener(REPORT_TAB_EVENT, handleTabRequest);
  }, [selectTab]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TAB_ORDER.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % TAB_ORDER.length
            : (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    const nextTab = TAB_ORDER[nextIndex];
    selectTab(nextTab);
    tabListRef.current
      ?.querySelector<HTMLButtonElement>(`[data-report-tab="${nextTab}"]`)
      ?.focus();
  }

  const panels: Record<ReportTab, ReactNode> = {
    activities,
    overview,
    students,
  };

  return (
    <div className="min-w-0">
      <div
        aria-label={labels.overview}
        className="inline-grid max-w-full grid-cols-3 gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm"
        onKeyDown={handleKeyDown}
        ref={tabListRef}
        role="tablist"
      >
        {TAB_ORDER.map((tab) => (
          <button
            aria-controls={`${id}-${tab}-panel`}
            aria-selected={activeTab === tab}
            className="interactive-chip min-h-10 min-w-0 rounded-md px-3 py-2 text-sm font-bold leading-snug text-slate-600 aria-selected:bg-[var(--primary-soft)] aria-selected:text-[var(--primary-strong)]"
            data-report-tab={tab}
            id={`${id}-${tab}-tab`}
            key={tab}
            onClick={() => selectTab(tab)}
            role="tab"
            tabIndex={activeTab === tab ? 0 : -1}
            type="button"
          >
            <span className="block min-w-0 break-words">{labels[tab]}</span>
          </button>
        ))}
      </div>

      {TAB_ORDER.map((tab) => (
        <section
          aria-labelledby={`${id}-${tab}-tab`}
          className="local-panel-enter mt-4 min-w-0"
          hidden={activeTab !== tab}
          id={`${id}-${tab}-panel`}
          key={`${tab}-${activeTab === tab ? "active" : "hidden"}`}
          role="tabpanel"
          tabIndex={0}
        >
          {panels[tab]}
        </section>
      ))}
    </div>
  );
}

export function ReportTabAction({
  children,
  className = "btn btn-secondary min-h-10",
  tab,
}: {
  children: ReactNode;
  className?: string;
  tab: ReportTab;
}) {
  return (
    <button
      className={className}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent<ReportTab>(REPORT_TAB_EVENT, { detail: tab }),
        )
      }
      type="button"
    >
      {children}
    </button>
  );
}
