"use client";

import { useEffect, useState } from "react";
import { getActivityCategoryTone } from "@/lib/activity-category-styles";

const PAUSE_STORAGE_KEY = "sah_home_activity_flow_paused";

type ActivityFlowItem = {
  category: string;
  label: string;
};

export function HomepageActivityFlow({
  items,
  labels,
}: {
  items: ActivityFlowItem[];
  labels: {
    description: string;
    eyebrow: string;
    pause: string;
    resume: string;
    title: string;
  };
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        setIsPaused(sessionStorage.getItem(PAUSE_STORAGE_KEY) === "true");
      } catch {
        // Session storage is optional; the control still works for this render.
      }
    }, 0);

    function updateVisibility() {
      setIsPageVisible(document.visibilityState === "visible");
    }

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      window.clearTimeout(restoreTimer);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  function togglePaused() {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);

    try {
      sessionStorage.setItem(PAUSE_STORAGE_KEY, String(nextPaused));
    } catch {
      // Keep the in-memory preference when storage is unavailable.
    }
  }

  return (
    <section
      aria-labelledby="homepage-activity-flow-title"
      className="homepage-activity-flow"
      data-paused={isPaused || !isPageVisible ? "true" : "false"}
    >
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="page-eyebrow">{labels.eyebrow}</p>
            <h2
              className="mt-2 break-words text-xl font-bold leading-snug text-slate-950 sm:text-2xl"
              id="homepage-activity-flow-title"
            >
              {labels.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {labels.description}
            </p>
          </div>
          <button
            aria-pressed={isPaused}
            className="activity-flow-control btn btn-secondary w-full shrink-0 sm:w-auto"
            onClick={togglePaused}
            type="button"
          >
            <span aria-hidden="true">{isPaused ? "▶" : "Ⅱ"}</span>
            {isPaused ? labels.resume : labels.pause}
          </button>
        </div>

        <ul className="sr-only">
          {items.map((item) => (
            <li key={`${item.category}-${item.label}`}>{item.label}</li>
          ))}
        </ul>

        <div aria-hidden="true" className="activity-flow-viewport mt-5">
          <FlowRow items={items} />
          <FlowRow items={[...items].reverse()} reverse />
        </div>
      </div>
    </section>
  );
}

function FlowRow({
  items,
  reverse = false,
}: {
  items: ActivityFlowItem[];
  reverse?: boolean;
}) {
  return (
    <div className="activity-flow-row">
      <div className={reverse ? "activity-flow-track activity-flow-track-reverse" : "activity-flow-track"}>
        <FlowGroup items={items} />
        <FlowGroup items={items} />
      </div>
    </div>
  );
}

function FlowGroup({ items }: { items: ActivityFlowItem[] }) {
  return (
    <div className="activity-flow-group">
      {items.map((item) => (
        <span
          className="activity-flow-pill"
          data-category-tone={getActivityCategoryTone(item.category)}
          key={`${item.category}-${item.label}`}
        >
          <span aria-hidden="true" className="activity-flow-dot" />
          <span className="break-words">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
