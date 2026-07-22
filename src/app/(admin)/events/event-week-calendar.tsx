"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { EventQuickViewModal } from "@/components/events/event-quick-view-modal";
import {
  formatDateRange,
  formatLongDate,
  formatTime,
  formatWeekdayShort,
} from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import { CategoryBadge, StatusBadge } from "../_components/page-ui";
import type { EventBrowserItem, EventBrowserLabels } from "./event-browser";

export type EventWeekLabels = EventBrowserLabels & {
  nextWeek: string;
  noEventsOnDay: string;
  noEventsThisWeek: string;
  previousWeek: string;
  today: string;
  weekView: string;
};

type WeekNavigation = {
  nextHref: string;
  previousHref: string;
  todayHref: string;
  todayWeek: string;
};

export function EventWeekCalendar({
  items,
  labels,
  locale,
  navigation,
  weekStart,
}: {
  items: EventBrowserItem[];
  labels: EventWeekLabels;
  locale: Locale;
  navigation: WeekNavigation;
  weekStart: string;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const startDate = useMemo(() => dateFromKey(weekStart), [weekStart]);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(startDate, index)),
    [startDate],
  );
  const today = useMemo(() => new Date(), []);
  const initialSelectedDate = weekDates.some((date) => isSameDay(date, today))
    ? today
    : startDate;
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    dateKey(initialSelectedDate),
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const eventsByDate = useMemo(() => groupEventsByDate(items), [items]);
  const visibleEvents = weekDates.flatMap(
    (date) => eventsByDate.get(dateKey(date)) ?? [],
  );
  const selectedEvents = eventsByDate.get(selectedDateKey) ?? [];
  const selectedEvent =
    items.find((item) => item.id === selectedEventId) ?? null;
  const closeModal = useCallback(() => setSelectedEventId(null), []);

  function openEvent(eventId: string, trigger: HTMLElement) {
    returnFocusRef.current = trigger;
    setSelectedEventId(eventId);
  }

  function navigate(href: string) {
    startNavigation(() => router.push(href));
  }

  function goToToday() {
    if (weekStart === navigation.todayWeek) {
      setSelectedDateKey(dateKey(new Date()));
      return;
    }

    navigate(navigation.todayHref);
  }

  return (
    <>
      <section aria-label={labels.weekView} className="min-w-0">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-[var(--primary-strong)]">
              {labels.weekView}
            </p>
            <h3 className="mt-1 break-words text-xl font-bold text-slate-950">
              {formatDateRange(weekDates[0], weekDates[6], locale)}
            </h3>
          </div>
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2 sm:flex sm:w-auto">
            <button
              aria-label={labels.previousWeek}
              className="btn btn-secondary min-h-11 px-3"
              disabled={isNavigating}
              onClick={() => navigate(navigation.previousHref)}
              type="button"
            >
              <span aria-hidden="true">&larr;</span>
            </button>
            <button
              className="btn btn-secondary min-h-11 min-w-0 px-4"
              disabled={isNavigating}
              onClick={goToToday}
              type="button"
            >
              {labels.today}
            </button>
            <button
              aria-label={labels.nextWeek}
              className="btn btn-secondary min-h-11 px-3"
              disabled={isNavigating}
              onClick={() => navigate(navigation.nextHref)}
              type="button"
            >
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>

        {!visibleEvents.length ? (
          <div className="empty-state m-3 sm:m-4">
            <p className="text-sm font-bold text-slate-950">
              {labels.noEventsThisWeek}
            </p>
          </div>
        ) : null}

        <div className="hidden grid-cols-7 border-l border-t border-[var(--border)] md:grid">
          {weekDates.map((date) => {
            const events = eventsByDate.get(dateKey(date)) ?? [];
            const isToday = isSameDay(date, today);

            return (
              <section
                className="min-h-64 min-w-0 border-b border-r border-[var(--border)] bg-[var(--card)]"
                key={dateKey(date)}
              >
                <header
                  className={[
                    "border-b border-[var(--border)] px-2 py-2 text-center",
                    isToday ? "bg-[var(--primary-soft)]" : "bg-[var(--card-soft)]",
                  ].join(" ")}
                >
                  <p className="text-xs font-bold uppercase text-slate-600">
                    {formatWeekdayShort(date, locale)}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {date.getDate()}
                  </p>
                </header>
                <div className="space-y-2 p-2">
                  {events.length ? (
                    events.map((event) => (
                      <WeekEventCard
                        event={event}
                        key={event.id}
                        labels={labels}
                        locale={locale}
                        onOpen={openEvent}
                      />
                    ))
                  ) : (
                    <p className="px-1 py-3 text-center text-xs text-slate-500">
                      {labels.noEventsOnDay}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="md:hidden">
          <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain border-y border-[var(--border)] bg-[var(--card-soft)] p-3">
            {weekDates.map((date) => {
              const key = dateKey(date);
              const isSelected = key === selectedDateKey;

              return (
                <button
                  aria-label={formatLongDate(date, locale)}
                  aria-pressed={isSelected}
                  className={[
                    "flex min-h-16 min-w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2af68]",
                    isSelected
                      ? "border-[#f2af68] bg-[var(--primary-soft)] text-[var(--primary-strong)]"
                      : "border-[var(--border)] bg-[var(--card)] text-slate-700",
                  ].join(" ")}
                  key={key}
                  onClick={() => setSelectedDateKey(key)}
                  type="button"
                >
                  <span className="text-xs font-bold uppercase">
                    {formatWeekdayShort(date, locale)}
                  </span>
                  <span className="mt-1 text-lg font-black">{date.getDate()}</span>
                </button>
              );
            })}
          </div>

          <section className="p-3 sm:p-4">
            <h3 className="break-words text-base font-bold text-slate-950">
              {formatLongDate(dateFromKey(selectedDateKey), locale)}
            </h3>
            {selectedEvents.length ? (
              <div className="mt-3 grid gap-3">
                {selectedEvents.map((event) => (
                  <WeekEventCard
                    event={event}
                    key={event.id}
                    labels={labels}
                    locale={locale}
                    onOpen={openEvent}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state mt-3">
                <p className="text-sm font-bold text-slate-950">
                  {labels.noEventsOnDay}
                </p>
              </div>
            )}
          </section>
        </div>
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

function WeekEventCard({
  event,
  labels,
  locale,
  onOpen,
}: {
  event: EventBrowserItem;
  labels: EventWeekLabels;
  locale: Locale;
  onOpen: (eventId: string, trigger: HTMLElement) => void;
}) {
  return (
    <button
      aria-label={`${labels.viewEvent}: ${event.title}`}
      className="interactive-card block min-h-20 w-full min-w-0 cursor-pointer rounded-lg border border-[var(--border)] border-l-[#f2af68] bg-[var(--card-soft)] p-2 text-left hover:bg-[var(--primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2af68]"
      onClick={(clickEvent) => onOpen(event.id, clickEvent.currentTarget)}
      type="button"
    >
      <span className="block text-xs font-bold text-slate-600">
        {formatTime(event.startsAt, locale)}–{formatTime(event.endsAt, locale)}
      </span>
      <span className="mt-1 block break-words text-sm font-bold leading-snug text-slate-950">
        {event.title}
      </span>
      <span className="mt-2 flex min-w-0 flex-wrap gap-1">
        {event.categoryLabel ? (
          <CategoryBadge>{event.categoryLabel}</CategoryBadge>
        ) : null}
        <StatusBadge status={event.status}>{event.statusLabel}</StatusBadge>
        {event.registrationStatus === "registered" ||
        event.registrationStatus === "attended" ? (
          <StatusBadge variant="success">{labels.registered}</StatusBadge>
        ) : null}
        {event.cancellationNotice ? (
          <StatusBadge variant="warning">{labels.scheduleUpdate}</StatusBadge>
        ) : null}
      </span>
    </button>
  );
}

function groupEventsByDate(items: EventBrowserItem[]) {
  const grouped = new Map<string, EventBrowserItem[]>();

  items.forEach((event) => {
    const startsAt = new Date(event.startsAt);

    if (Number.isNaN(startsAt.getTime())) {
      return;
    }

    const key = dateKey(startsAt);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  });

  grouped.forEach((events) =>
    events.sort(
      (first, second) =>
        new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
    ),
  );

  return grouped;
}

function dateFromKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
    : new Date();
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(first: Date, second: Date) {
  return dateKey(first) === dateKey(second);
}
