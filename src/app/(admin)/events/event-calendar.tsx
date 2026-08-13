"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  EventQuickViewModal,
} from "@/components/events/event-quick-view-modal";
import {
  formatLongDate,
  formatMonthYear,
  formatTime,
  formatWeekdayShort,
} from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import {
  calendarDateFromDayKey,
  calendarDateKey,
  eventCalendarDayKey,
  getMonthCalendarGridDateKeys,
} from "@/lib/events/event-calendar-range";
import { CategoryBadge, StatusBadge } from "../_components/page-ui";
import type { EventBrowserItem, EventBrowserLabels } from "./event-browser";

const MAX_EVENTS_PER_DAY = 2;

export type EventCalendarLabels = EventBrowserLabels & {
  calendar: string;
  moreCount: string;
  nextMonth: string;
  noEventsOnDate: string;
  previousMonth: string;
  schoolCalendar: string;
  selectedDate: string;
  today: string;
};

type CalendarNavigation = {
  nextHref: string;
  previousHref: string;
  todayHref: string;
  todayMonth: string;
};

export function EventCalendar({
  items,
  labels,
  locale,
  month,
  navigation,
  timeZone,
}: {
  items: EventBrowserItem[];
  labels: EventCalendarLabels;
  locale: Locale;
  month: string;
  navigation: CalendarNavigation;
  timeZone: string;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const monthDate = useMemo(
    () => calendarDateFromDayKey(`${month}-01`),
    [month],
  );
  const todayKey = useMemo(
    () => eventCalendarDayKey(new Date(), timeZone),
    [timeZone],
  );
  const today = useMemo(() => calendarDateFromDayKey(todayKey), [todayKey]);
  const gridDates = useMemo(
    () =>
      getMonthCalendarGridDateKeys(month).map(calendarDateFromDayKey),
    [month],
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    isSameMonth(today, monthDate) ? dateKey(today) : dateKey(monthDate),
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const mobileDateStripRef = useRef<HTMLDivElement | null>(null);
  const selectedMobileDateRef = useRef<HTMLButtonElement | null>(null);
  const eventsByDate = useMemo(
    () => groupEventsByDate(items, timeZone),
    [items, timeZone],
  );
  const selectedEvents = eventsByDate.get(selectedDateKey) ?? [];
  const selectedDate = dateFromKey(selectedDateKey);
  const selectedEvent =
    items.find((item) => item.id === selectedEventId) ?? null;
  const closeModal = useCallback(() => setSelectedEventId(null), []);
  const weekdayDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addDays(new Date(Date.UTC(2024, 0, 1, 12)), index),
      ),
    [],
  );

  useEffect(() => {
    const strip = mobileDateStripRef.current;
    const selectedDateButton = selectedMobileDateRef.current;

    if (!strip || !selectedDateButton) {
      return;
    }

    strip.scrollTo({
      behavior: "smooth",
      left:
        selectedDateButton.offsetLeft -
        strip.clientWidth / 2 +
        selectedDateButton.clientWidth / 2,
    });
  }, [selectedDateKey]);

  function openEvent(eventId: string, trigger: HTMLElement) {
    returnFocusRef.current = trigger;
    setSelectedEventId(eventId);
  }

  function navigate(href: string) {
    startNavigation(() => router.push(href));
  }

  function goToToday() {
    if (month === navigation.todayMonth) {
      setSelectedDateKey(eventCalendarDayKey(new Date(), timeZone));
      return;
    }

    navigate(navigation.todayHref);
  }

  function renderDesktopDate(date: Date, index: number) {
    const key = dateKey(date);
    const dayEvents = eventsByDate.get(key) ?? [];
    const isCurrentMonth = isSameMonth(date, monthDate);
    const isSelected = key === selectedDateKey;
    const isToday = isSameDay(date, today);
    const hiddenCount = Math.max(
      dayEvents.length - MAX_EVENTS_PER_DAY,
      0,
    );

    return (
      <div
        aria-label={formatLongDate(date, locale, "UTC")}
        aria-selected={isSelected}
        className={[
          "min-h-36 min-w-0 border-b border-r border-[var(--border)] p-1.5",
          index % 7 === 6 ? "border-r-0" : "",
          isCurrentMonth
            ? "bg-[var(--card)]"
            : "bg-[var(--card-soft)] opacity-65",
          isSelected ? "ring-2 ring-inset ring-[#f2af68]" : "",
        ].join(" ")}
        key={key}
        role="gridcell"
      >
        <button
          aria-current={isToday ? "date" : undefined}
          aria-pressed={isSelected}
          className={[
            "flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2af68]",
            isToday
              ? "bg-[#f2af68] text-slate-950"
              : "text-slate-700 hover:bg-[var(--primary-soft)]",
          ].join(" ")}
          onClick={() => setSelectedDateKey(key)}
          type="button"
        >
          {date.getUTCDate()}
        </button>

        <div className="mt-1 space-y-1">
          {dayEvents.slice(0, MAX_EVENTS_PER_DAY).map((event) => (
            <CalendarEventChip
              event={event}
              key={event.id}
              labels={labels}
              locale={locale}
              onOpen={openEvent}
              isPast={key < todayKey}
              timeZone={timeZone}
            />
          ))}
          {hiddenCount ? (
            <button
              className="min-h-8 w-full cursor-pointer rounded px-1.5 text-left text-xs font-bold text-[var(--primary-strong)] transition hover:bg-[var(--primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2af68]"
              onClick={() => setSelectedDateKey(key)}
              type="button"
            >
              {formatCount(labels.moreCount, hiddenCount)}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <section
        aria-label={labels.schoolCalendar}
        className="min-w-0"
      >
        <CalendarToolbar
          isNavigating={isNavigating}
          labels={labels}
          locale={locale}
          monthDate={monthDate}
          onNext={() => navigate(navigation.nextHref)}
          onPrevious={() => navigate(navigation.previousHref)}
          onToday={goToToday}
        />

        <div className="hidden md:block">
          <div
            aria-label={labels.calendar}
            className="border-x border-t border-[var(--border)]"
            role="grid"
          >
            <div className="grid grid-cols-7" role="row">
              {weekdayDates.map((date) => (
                <div
                  className="border-b border-r border-[var(--border)] bg-[var(--card-soft)] px-2 py-2 text-center text-xs font-bold uppercase text-slate-600 last:border-r-0"
                  key={date.toISOString()}
                  role="columnheader"
                >
                  {formatWeekdayShort(date, locale, "UTC")}
                </div>
              ))}
            </div>

            {Array.from({ length: 6 }, (_, weekIndex) => (
              <div className="grid grid-cols-7" key={weekIndex} role="row">
                {gridDates
                  .slice(weekIndex * 7, weekIndex * 7 + 7)
                  .map((date, dayIndex) =>
                    renderDesktopDate(date, weekIndex * 7 + dayIndex),
                  )}
              </div>
            ))}
          </div>

          <CalendarAgenda
            events={selectedEvents}
            key={`desktop-${selectedDateKey}`}
            labels={labels}
            locale={locale}
            onOpen={openEvent}
            selectedDate={selectedDate}
            timeZone={timeZone}
          />
        </div>

        <div className="md:hidden">
          <div
            aria-label={labels.selectedDate}
            className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain border-y border-[var(--border)] bg-[var(--card-soft)] p-3"
            ref={mobileDateStripRef}
          >
            {gridDates.map((date) => {
              const key = dateKey(date);
              const isSelected = key === selectedDateKey;
              const isToday = isSameDay(date, today);
              const isCurrentMonth = isSameMonth(date, monthDate);

              return (
                <button
                  aria-current={isToday ? "date" : undefined}
                  aria-label={formatLongDate(date, locale, "UTC")}
                  aria-pressed={isSelected}
                  className={[
                    "flex min-h-16 min-w-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2af68]",
                    isSelected
                      ? "border-[#f2af68] bg-[var(--primary-soft)] text-[var(--primary-strong)] shadow-sm"
                      : isCurrentMonth
                        ? "border-[var(--border)] bg-[var(--card)] text-slate-700"
                        : "border-[var(--border)] bg-[var(--card-soft)] text-slate-500",
                  ].join(" ")}
                  key={key}
                  onClick={() => setSelectedDateKey(key)}
                  ref={isSelected ? selectedMobileDateRef : undefined}
                  type="button"
                >
                  <span className="text-xs font-bold uppercase">
                    {formatWeekdayShort(date, locale, "UTC")}
                  </span>
                  <span className="mt-1 text-lg font-black">
                    {date.getUTCDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <CalendarAgenda
            events={selectedEvents}
            key={`mobile-${selectedDateKey}`}
            labels={labels}
            locale={locale}
            onOpen={openEvent}
            selectedDate={selectedDate}
            timeZone={timeZone}
          />
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

function CalendarToolbar({
  isNavigating,
  labels,
  locale,
  monthDate,
  onNext,
  onPrevious,
  onToday,
}: {
  isNavigating: boolean;
  labels: EventCalendarLabels;
  locale: Locale;
  monthDate: Date;
  onNext: () => void;
  onPrevious: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase text-[var(--primary-strong)]">
          {labels.schoolCalendar}
        </p>
        <h3 className="mt-1 break-words text-xl font-bold capitalize text-slate-950">
          {formatMonthYear(monthDate, locale, "UTC")}
        </h3>
      </div>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2 sm:flex sm:w-auto">
        <button
          aria-label={labels.previousMonth}
          className="btn btn-secondary min-h-11 px-3"
          disabled={isNavigating}
          onClick={onPrevious}
          type="button"
        >
          <span aria-hidden="true">&larr;</span>
        </button>
        <button
          className="btn btn-secondary min-h-11 min-w-0 px-4"
          disabled={isNavigating}
          onClick={onToday}
          type="button"
        >
          {labels.today}
        </button>
        <button
          aria-label={labels.nextMonth}
          className="btn btn-secondary min-h-11 px-3"
          disabled={isNavigating}
          onClick={onNext}
          type="button"
        >
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </div>
  );
}

function CalendarEventChip({
  event,
  isPast,
  labels,
  locale,
  onOpen,
  timeZone,
}: {
  event: EventBrowserItem;
  isPast: boolean;
  labels: EventCalendarLabels;
  locale: Locale;
  onOpen: (eventId: string, trigger: HTMLElement) => void;
  timeZone: string;
}) {
  return (
    <button
      aria-label={`${labels.viewEvent}: ${event.title}`}
      className={[
        "interactive-chip block min-h-11 w-full cursor-pointer overflow-hidden rounded-md border border-[var(--border)] bg-[var(--card-soft)] px-2 py-1.5 text-left hover:border-[#f2af68] hover:bg-[var(--primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2af68]",
        isPast ? "border-l-slate-400 opacity-80" : "border-l-[#f2af68]",
      ].join(" ")}
      onClick={(clickEvent) => onOpen(event.id, clickEvent.currentTarget)}
      type="button"
    >
      <span className="block truncate text-[11px] font-bold text-slate-600">
        {formatTime(event.startsAt, locale, timeZone)} ·{" "}
        {calendarIndicatorLabel(event, labels)}
      </span>
      <span className="mt-0.5 block truncate text-xs font-bold text-slate-950">
        {event.title}
      </span>
      {event.cancellationNotice ? (
        <span className="mt-0.5 block truncate text-[10px] font-bold text-amber-800 dark:text-amber-200">
          {labels.scheduleUpdate}
        </span>
      ) : null}
    </button>
  );
}

function CalendarAgenda({
  events,
  labels,
  locale,
  onOpen,
  selectedDate,
  timeZone,
}: {
  events: EventBrowserItem[];
  labels: EventCalendarLabels;
  locale: Locale;
  onOpen: (eventId: string, trigger: HTMLElement) => void;
  selectedDate: Date;
  timeZone: string;
}) {
  return (
    <section className="local-panel-enter border-t border-[var(--border)] p-3 sm:p-4">
      <p className="text-xs font-bold uppercase text-[var(--primary-strong)]">
        {labels.selectedDate}
      </p>
      <h3 className="mt-1 break-words text-base font-bold capitalize text-slate-950 sm:text-lg">
        {formatLongDate(selectedDate, locale, "UTC")}
      </h3>

      {events.length ? (
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {events.map((event) => (
            <button
              aria-label={`${labels.viewEvent}: ${event.title}`}
              className="interactive-card min-w-0 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2af68]"
              key={event.id}
              onClick={(clickEvent) =>
                onOpen(event.id, clickEvent.currentTarget)
              }
              type="button"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                {event.categoryLabel ? (
                  <CategoryBadge category={event.categoryValue}>
                    {event.categoryLabel}
                  </CategoryBadge>
                ) : null}
                <StatusBadge status={event.status}>
                  {event.statusLabel}
                </StatusBadge>
                {event.registrationStatus === "registered" ||
                event.registrationStatus === "attended" ? (
                  <StatusBadge variant="success">{labels.registered}</StatusBadge>
                ) : null}
                {event.cancellationNotice ? (
                  <StatusBadge variant="warning">{labels.scheduleUpdate}</StatusBadge>
                ) : null}
                {event.isMyClubEvent ? (
                  <StatusBadge variant="info">{labels.myClub}</StatusBadge>
                ) : null}
                {event.isPartnerEvent ? (
                  <StatusBadge variant="info">{labels.partnerSchool}</StatusBadge>
                ) : null}
              </span>
              <span className="mt-3 block break-words text-base font-bold text-slate-950">
                {event.title}
              </span>
              <span className="mt-1 block text-sm font-semibold text-slate-700">
                {formatTime(event.startsAt, locale, timeZone)}–{formatTime(event.endsAt, locale, timeZone)}
              </span>
              <span className="mt-1 block break-words text-sm text-slate-600">
                {event.location || "-"}
              </span>
              {event.isPartnerEvent ? (
                <span className="mt-1 block break-words text-sm text-slate-600">
                  {labels.hostedBy}: {event.hostName}
                </span>
              ) : null}
              {event.registrationStateLabel ? (
                <span className="mt-2 block text-sm font-bold text-[var(--primary-strong)]">
                  {event.registrationStateLabel}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state mt-3">
          <p className="text-sm font-bold text-slate-950">
            {labels.noEventsOnDate}
          </p>
        </div>
      )}
    </section>
  );
}

function groupEventsByDate(items: EventBrowserItem[], timeZone: string) {
  const eventsByDate = new Map<string, EventBrowserItem[]>();

  items.forEach((event) => {
    const key = eventCalendarDayKey(event.startsAt, timeZone);

    if (!key) {
      return;
    }

    const events = eventsByDate.get(key) ?? [];
    events.push(event);
    eventsByDate.set(key, events);
  });

  eventsByDate.forEach((events) =>
    events.sort(
      (first, second) =>
        new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
    ),
  );

  return eventsByDate;
}

function dateKey(date: Date) {
  return calendarDateKey(date);
}

function dateFromKey(key: string) {
  return calendarDateFromDayKey(key);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function isSameDay(first: Date, second: Date) {
  return dateKey(first) === dateKey(second);
}

function isSameMonth(first: Date, second: Date) {
  return (
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth()
  );
}

function formatCount(template: string, count: number) {
  return template.replace("{count}", String(count));
}

function calendarIndicatorLabel(
  event: EventBrowserItem,
  labels: EventCalendarLabels,
) {
  if (event.status === "pending_approval") {
    return event.statusLabel;
  }

  if (
    event.registrationStatus === "registered" ||
    event.registrationStatus === "attended"
  ) {
    return labels.registered;
  }

  if (event.isMyClubEvent) {
    return labels.myClub;
  }

  return event.isPartnerEvent ? labels.partnerSchool : event.statusLabel;
}
