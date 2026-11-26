"use client";

import { useCallback, useRef, useState } from "react";
import { getActivityCategoryTone } from "@/lib/activity-category-styles";
import {
  EventQuickViewModal,
  type EventQuickViewItem,
  type EventQuickViewLabels,
} from "@/components/events/event-quick-view-modal";

export type StudentUpcomingEvent = EventQuickViewItem & {
  posterUrl: string | null;
  tileDay: string;
  tileMonth: string;
};

export function StudentUpcomingEvents({
  description,
  events,
  labels,
  locationNotSet,
  title,
}: {
  description: string;
  events: StudentUpcomingEvent[];
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
        <ul className="dashboard-upcoming-list upcoming-cards">
          {events.map((event) => (
            <li className="min-w-0" key={event.id}>
              <button
                aria-label={`${labels.viewEvent}: ${event.title}`}
                className="upcoming-card group"
                onClick={(clickEvent) =>
                  openEvent(event, clickEvent.currentTarget)
                }
                type="button"
              >
                <span className="upcoming-card-cover" data-category-tone={getActivityCategoryTone(event.categoryValue)}>
                  {event.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" src={event.posterUrl} />
                  ) : (
                    <span aria-hidden="true" className="event-card-poster-fallback upcoming-card-fallback">
                      <span className="event-card-category-mark flex h-12 w-12 items-center justify-center rounded-xl border text-base font-black">
                        {event.hostName.slice(0, 2).toUpperCase()}
                      </span>
                    </span>
                  )}
                </span>
                <span className="upcoming-card-body">
                  <span aria-hidden="true" className="event-date-tile">
                    <span>{event.tileMonth}</span>
                    <b>{event.tileDay}</b>
                  </span>
                  <span className="min-w-0">
                    <span className="block break-words font-semibold leading-snug text-slate-950 transition group-hover:text-[var(--primary-strong)]">
                      {event.title}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {event.dateTimeLabel}
                    </span>
                    <span className="mt-0.5 block break-words text-sm text-slate-600">
                      {event.location || locationNotSet}
                    </span>
                    {event.cancellationNotice ? (
                      <span className="badge badge-warning mt-2 w-fit">
                        {labels.scheduleUpdate}
                      </span>
                    ) : null}
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
