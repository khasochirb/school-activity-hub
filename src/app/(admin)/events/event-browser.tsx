"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  EventPrimaryAction,
  EventQuickViewModal,
  type EventQuickViewItem,
  type EventQuickViewLabels,
} from "@/components/events/event-quick-view-modal";
import { getActivityCategoryTone } from "@/lib/activity-category-styles";
import { CategoryBadge, StatusBadge } from "../_components/page-ui";

export type EventBrowserItem = EventQuickViewItem & {
  categoryValue: string | null;
  dateBadgeLabel: string;
  dayKey: string;
  dayLabel: string;
  endsAt: string;
  isMyClubEvent: boolean;
  isPartnerEvent: boolean;
  posterDay: string;
  posterMonth: string;
  posterUrl: string | null;
  startsAt: string;
  timeRangeLabel: string;
  visualInitials: string;
  weekdayLabel: string;
};

export type EventBrowserLabels = EventQuickViewLabels & {
  myClub: string;
  noPoster: string;
  partnerSchool: string;
  posterAlt: string;
  registered: string;
};

export function EventBrowser({
  items,
  labels,
}: {
  items: EventBrowserItem[];
  labels: EventBrowserLabels;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectedEvent = items.find((item) => item.id === selectedEventId) ?? null;
  const closeModal = useCallback(() => setSelectedEventId(null), []);

  function openModal(eventId: string, trigger?: HTMLButtonElement | null) {
    returnFocusRef.current = trigger ?? triggerRefs.current.get(eventId) ?? null;
    setSelectedEventId(eventId);
  }

  return (
    <>
      <div className="event-timeline p-3 sm:p-5">
        {groupByDay(items).map((day) => (
          <section
            aria-label={`${day.label}, ${day.weekday}`}
            className="event-day"
            key={day.key}
          >
            <p className="event-day-head">
              {day.label}
              <span>{day.weekday}</span>
            </p>
            <div className="flex min-w-0 flex-col gap-3">
              {day.items.map((item) => (
                <EventCard
                  item={item}
                  key={item.id}
                  labels={labels}
                  onOpen={(trigger) => openModal(item.id, trigger)}
                  registerTrigger={(node) => {
                    if (node) triggerRefs.current.set(item.id, node);
                    else triggerRefs.current.delete(item.id);
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <EventQuickViewModal
        event={selectedEvent}
        labels={labels}
        onClose={closeModal}
        returnFocusRef={returnFocusRef}
      />
    </>
  );
}

function EventCard({
  item,
  labels,
  onOpen,
  registerTrigger,
}: {
  item: EventBrowserItem;
  labels: EventBrowserLabels;
  onOpen: (trigger?: HTMLButtonElement | null) => void;
  registerTrigger: (node: HTMLButtonElement | null) => void;
}) {
  const [posterFailed, setPosterFailed] = useState(false);
  const categoryTone = getActivityCategoryTone(item.categoryValue);
  const hasPoster = Boolean(item.posterUrl && !posterFailed);
  const isRegistered =
    item.registrationStatus === "registered" ||
    item.registrationStatus === "attended";

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, form, input, select, textarea")) return;
    onOpen();
  }

  return (
    <article
      className="event-tl-card interactive-card group"
      data-category-tone={categoryTone}
      onClick={handleCardClick}
    >
      <div className="min-w-0">
        <p className="event-tl-time">{item.timeRangeLabel}</p>
        <Link
          className="event-tl-title focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          href={`/events/${item.id}`}
        >
          {item.title}
        </Link>
        <p className="event-tl-row">
          <span aria-hidden="true" className="event-tl-host-mark">
            {item.visualInitials.slice(0, 1)}
          </span>
          <span className="min-w-0 break-words">{item.hostName}</span>
        </p>
        <p className="event-tl-row">
          <PinIcon />
          <span className="min-w-0 break-words">{item.location || "-"}</span>
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {isRegistered ? (
            <StatusBadge variant="success">{labels.registered}</StatusBadge>
          ) : null}
          {item.status !== "approved" ? (
            <StatusBadge status={item.status}>{item.statusLabel}</StatusBadge>
          ) : null}
          {item.categoryLabel ? (
            <CategoryBadge category={item.categoryValue}>
              {item.categoryLabel}
            </CategoryBadge>
          ) : null}
          {item.isMyClubEvent ? (
            <StatusBadge variant="info">{labels.myClub}</StatusBadge>
          ) : null}
          {item.isPartnerEvent ? (
            <StatusBadge variant="info">{labels.partnerSchool}</StatusBadge>
          ) : null}
          {item.permissionRequired ? (
            <StatusBadge variant="warning">{labels.permissionRequired}</StatusBadge>
          ) : null}
          {item.experienceLabel ? (
            <StatusBadge variant="info">{item.experienceLabel}</StatusBadge>
          ) : null}
          {item.hasEligibilityInfo ? (
            <StatusBadge>{labels.eligibility}</StatusBadge>
          ) : null}
          {item.cancellationNotice ? (
            <StatusBadge variant="warning">{labels.scheduleUpdate}</StatusBadge>
          ) : null}
        </div>

        <p className="event-tl-facts">
          <span>
            {labels.cost}: {item.costLabel}
          </span>
          <span>
            {labels.registration}: {item.attendeeCount}
            {item.capacity === null ? "" : ` / ${item.capacity}`}
          </span>
          {item.remainingSpaces !== null ? (
            <span>
              {labels.spacesRemaining}: {item.remainingSpaces}
            </span>
          ) : null}
          {item.registrationStateLabel ? (
            <span>{item.registrationStateLabel}</span>
          ) : null}
        </p>

      </div>

      <div className="event-tl-cover" data-category-tone={categoryTone}>
        {hasPoster && item.posterUrl ? (
          <Image
            alt={labels.posterAlt.replace("{event}", item.title)}
            className="object-cover"
            fill
            onError={() => setPosterFailed(true)}
            sizes="(max-width: 639px) 96px, 132px"
            src={item.posterUrl}
            unoptimized
          />
        ) : (
          <div
            aria-label={labels.noPoster}
            className="event-card-poster-fallback flex h-full w-full items-center justify-center"
            role="img"
          >
            <span
              aria-hidden="true"
              className="event-card-category-mark flex h-12 w-12 items-center justify-center rounded-xl border text-base font-black"
            >
              {item.visualInitials}
            </span>
          </div>
        )}
      </div>

      <div
        className="event-tl-actions"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="btn btn-secondary min-h-10 w-full sm:w-auto"
          onClick={(event) => onOpen(event.currentTarget)}
          ref={registerTrigger}
          type="button"
        >
          {labels.viewEvent}
        </button>
        <div className="w-full sm:w-auto">
          <EventPrimaryAction item={item} labels={labels} />
        </div>
      </div>
    </article>
  );
}

function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 flex-none"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
    >
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function groupByDay(items: EventBrowserItem[]) {
  const days: {
    items: EventBrowserItem[];
    key: string;
    label: string;
    weekday: string;
  }[] = [];
  for (const item of items) {
    const last = days[days.length - 1];
    if (last && last.key === item.dayKey) last.items.push(item);
    else
      days.push({
        items: [item],
        key: item.dayKey,
        label: item.dayLabel,
        weekday: item.weekdayLabel,
      });
  }
  return days;
}
