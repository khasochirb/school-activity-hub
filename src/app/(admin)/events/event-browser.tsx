"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import {
  EventQuickViewModal,
  type EventQuickViewItem,
  type EventQuickViewLabels,
} from "@/components/events/event-quick-view-modal";
import { getActivityCategoryTone } from "@/lib/activity-category-styles";
import { joinEvent } from "@/app/(admin)/events/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { categoryColor } from "@/lib/ui/category-colors";
import { ActionMenu } from "../_components/action-menu";

const colorVar = (color: string) => ({ "--c": color }) as CSSProperties;

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
  goingCount: string;
  join: string;
  moreActions: string;
  myClub: string;
  openEvent: string;
  spotsLeft: string;
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
      <div className="cl-tl">
        {groupByDay(items).map((day) => (
          <section
            aria-label={`${day.label}, ${day.weekday}`}
            className="cl-tlday"
            key={day.key}
          >
            <p className="cl-tlhead">
              <span aria-hidden="true" className="cl-dtile">
                <span>{day.month}</span>
                <b>{day.dayOfMonth}</b>
              </span>
              <small>{day.weekday}</small>
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
      className="cl-card cl-tlcard interactive-card group"
      data-category-tone={categoryTone}
      onClick={handleCardClick}
    >
      <div className="min-w-0">
        <span className="cl-time">{item.timeRangeLabel}</span>
        <Link
          className="cl-tl-title focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          href={`/events/${item.id}`}
        >
          {item.title}
        </Link>
        <p className="cl-ri">
          <span
            aria-hidden="true"
            className="cl-clubav"
            style={{ ...colorVar(categoryColor(item.categoryValue)), fontSize: 9, height: 18, width: 18, borderRadius: 5 }}
          >
            {item.visualInitials.slice(0, 1)}
          </span>
          <span className="min-w-0 break-words">{item.hostName}</span>
        </p>
        {item.location ? (
          <p className="cl-ri">
            <PinIcon />
            <span className="min-w-0 break-words">{item.location}</span>
          </p>
        ) : null}
        {item.cancellationNotice || item.status !== "approved" || item.isPartnerEvent ? (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {item.cancellationNotice ? (
              <span className="cl-tag" data-tone="warn">{labels.scheduleUpdate}</span>
            ) : null}
            {item.status !== "approved" ? (
              <span className="cl-tag" data-tone="warn">{item.statusLabel}</span>
            ) : null}
            {item.isPartnerEvent ? (
              <span className="cl-tag" data-tone="blue">{labels.partnerSchool}</span>
            ) : null}
          </p>
        ) : null}
        <div className="cl-tl-ft">
          {item.categoryLabel ? (
            <span className="cl-cat" style={colorVar(categoryColor(item.categoryValue))}>
              {item.categoryLabel}
            </span>
          ) : null}
          <span className="cl-tl-meta">
            {labels.goingCount.replace("{count}", String(item.attendeeCount))}
            {item.remainingSpaces !== null
              ? ` · ${labels.spotsLeft.replace("{count}", String(item.remainingSpaces))}`
              : ""}
            {item.costType && item.costType !== "free" ? ` · ${item.costLabel}` : ""}
          </span>
          <span className="cl-tl-action">
            {item.isStaff ? (
              <ActionMenu
                items={[
                  { href: `/events/${item.id}`, label: labels.openEvent },
                  ...(item.canManageEvent
                    ? [{ href: `/events/${item.id}/attendance`, label: labels.attendanceQr }]
                    : []),
                ]}
                label={labels.moreActions}
              />
            ) : isRegistered ? (
              <span className="cl-btn-soft cl-btn-done">✓ {labels.registered}</span>
            ) : item.status === "approved" && item.hasCurrentStudent && item.canRegister ? (
              <form action={joinEvent}>
                <input name="event_id" type="hidden" value={item.id} />
                <PendingSubmitButton
                  className="cl-btn-soft disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={item.isFull}
                  pendingLabel={labels.joining}
                  toastMessage={labels.joining}
                >
                  {item.isFull ? labels.registrationFull : labels.join}
                </PendingSubmitButton>
              </form>
            ) : (
              <button
                className="cl-btn-soft"
                onClick={(event) => onOpen(event.currentTarget)}
                ref={registerTrigger}
                type="button"
              >
                {labels.viewEvent}
              </button>
            )}
          </span>
        </div>
      </div>

      <div className="event-tl-cover" data-category-tone={categoryTone}>
        {hasPoster && item.posterUrl ? (
          <Image
            alt={labels.posterAlt.replace("{event}", item.title)}
            className="object-cover"
            fill
            onError={() => setPosterFailed(true)}
            sizes="(max-width: 639px) 104px, 124px"
            src={item.posterUrl}
            unoptimized
          />
        ) : (
          <div
            aria-label={labels.noPoster}
            className="event-card-poster-fallback cl-cover h-full w-full"
            role="img"
            style={colorVar(categoryColor(item.categoryValue))}
          >
            <span aria-hidden="true">{item.visualInitials}</span>
          </div>
        )}
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
    dayOfMonth: string;
    items: EventBrowserItem[];
    key: string;
    label: string;
    month: string;
    weekday: string;
  }[] = [];
  for (const item of items) {
    const last = days[days.length - 1];
    if (last && last.key === item.dayKey) last.items.push(item);
    else
      days.push({
        dayOfMonth: item.posterDay,
        items: [item],
        key: item.dayKey,
        label: item.dayLabel,
        month: item.posterMonth,
        weekday: item.weekdayLabel,
      });
  }
  return days;
}
