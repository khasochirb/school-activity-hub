"use client";

import { useCallback, useRef, useState } from "react";
import {
  EventQuickViewModal,
  type EventQuickViewItem,
  type EventQuickViewLabels,
} from "@/components/events/event-quick-view-modal";

export function StudentUpcomingEvents({
  description,
  events,
  labels,
  locationNotSet,
  title,
}: {
  description: string;
  events: EventQuickViewItem[];
  labels: EventQuickViewLabels;
  locationNotSet: string;
  title: string;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? null;
  const closeModal = useCallback(() => setSelectedEventId(null), []);

  function openEvent(event: EventQuickViewItem, trigger: HTMLButtonElement) {
    returnFocusRef.current = trigger;
    setSelectedEventId(event.id);
  }

  return (
    <>
      <section className="section-card">
        <div className="section-header">
          <h2 className="section-title">{title}</h2>
          <p className="section-description">{description}</p>
        </div>
        <ul className="dashboard-upcoming-list divide-y divide-[var(--border)]">
          {events.map((event) => (
            <li key={event.id}>
              <button
                aria-label={`${labels.viewEvent}: ${event.title}`}
                className="group flex min-h-24 w-full cursor-pointer items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-[var(--card-soft)] active:bg-[var(--card-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]"
                onClick={(clickEvent) =>
                  openEvent(event, clickEvent.currentTarget)
                }
                type="button"
              >
                <span className="min-w-0">
                  <span className="block break-words font-semibold text-slate-950 transition group-hover:text-[var(--primary-strong)]">
                    {event.title}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    {event.dateTimeLabel}
                  </span>
                  <span className="mt-1 block break-words text-sm text-slate-600">
                    {event.location || locationNotSet}
                  </span>
                  {event.cancellationNotice ? (
                    <span className="badge badge-warning mt-2 w-fit">
                      {labels.scheduleUpdate}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--primary-strong)]">
                  <span className="hidden sm:inline">{labels.viewEvent}</span>
                  <span aria-hidden="true" className="motion-directional text-lg">
                    &rarr;
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <EventQuickViewModal
        event={selectedEvent}
        labels={labels}
        onClose={closeModal}
        returnFocusRef={returnFocusRef}
      />
    </>
  );
}
