"use client";

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
import { CategoryBadge, StatusBadge } from "../_components/page-ui";

export type EventBrowserItem = EventQuickViewItem & {
  categoryValue: string | null;
  dateBadgeLabel: string;
  endsAt: string;
  isMyClubEvent: boolean;
  isPartnerEvent: boolean;
  startsAt: string;
  visualInitials: string;
};

export type EventBrowserLabels = EventQuickViewLabels & {
  myClub: string;
  partnerSchool: string;
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
      <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-2">
        {items.map((item) => (
          <EventCard
            item={item}
            key={item.id}
            labels={labels}
            onOpen={(trigger) => openModal(item.id, trigger)}
            registerTrigger={(node) => {
              if (node) {
                triggerRefs.current.set(item.id, node);
              } else {
                triggerRefs.current.delete(item.id);
              }
            }}
          />
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
  const accent = categoryAccent(item.categoryValue);

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("a, button, form, input, select, textarea")) {
      return;
    }

    onOpen();
  }

  return (
    <article
      className="group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--card-shadow)] transition duration-150 hover:-translate-y-0.5 hover:border-[#f2af68]/70 hover:shadow-lg focus-within:border-[#f2af68]"
      onClick={handleCardClick}
    >
      <button
        aria-label={`${labels.viewEvent}: ${item.title}`}
        className="relative min-h-28 w-full overflow-hidden border-b border-[var(--border)] p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#f2af68]"
        onClick={(event) => onOpen(event.currentTarget)}
        ref={registerTrigger}
        style={{
          backgroundColor: `color-mix(in srgb, ${accent} 16%, var(--card-soft))`,
        }}
        type="button"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1.5"
          style={{ backgroundColor: accent }}
        />
        <span className="flex h-full items-start justify-between gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-lg font-black tracking-[0.04em]"
            style={{
              backgroundColor: "var(--card-overlay)",
              borderColor: accent,
              color: accent,
            }}
          >
            {item.visualInitials}
          </span>
          <span className="rounded-lg border border-[var(--border)] bg-[var(--card-overlay)] px-3 py-2 text-right text-xs font-bold leading-tight text-slate-700 shadow-sm">
            {item.dateBadgeLabel}
          </span>
        </span>
        <span className="mt-3 block break-words text-lg font-bold leading-tight text-slate-950 group-hover:text-[var(--primary-strong)]">
          {item.title}
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-2">
          {item.categoryLabel ? (
            <CategoryBadge>{item.categoryLabel}</CategoryBadge>
          ) : null}
          <StatusBadge status={item.status}>{item.statusLabel}</StatusBadge>
          {item.registrationStatus === "registered" ||
          item.registrationStatus === "attended" ? (
            <StatusBadge variant="success">{labels.registered}</StatusBadge>
          ) : null}
          {item.isMyClubEvent ? (
            <StatusBadge variant="info">{labels.myClub}</StatusBadge>
          ) : null}
          {item.isPartnerEvent ? (
            <StatusBadge variant="info">{labels.partnerSchool}</StatusBadge>
          ) : null}
          {item.permissionRequired ? (
            <StatusBadge variant="warning">
              {labels.permissionRequired}
            </StatusBadge>
          ) : null}
          {item.experienceLevel ? (
            <StatusBadge variant="info">{item.experienceLabel}</StatusBadge>
          ) : null}
          {item.hasEligibilityInfo ? (
            <StatusBadge>{labels.eligibility}</StatusBadge>
          ) : null}
          {item.cancellationNotice ? (
            <StatusBadge variant="warning">{labels.scheduleUpdate}</StatusBadge>
          ) : null}
          <StatusBadge
            variant={
              item.costType === "free"
                ? "success"
                : item.costType === "variable"
                  ? "warning"
                  : undefined
            }
          >
            {item.costLabel}
          </StatusBadge>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">{item.dateTimeLabel}</p>
          <p className="min-w-0 break-words">{item.location || "-"}</p>
          <p className="min-w-0 break-words">
            {item.schoolName}
          </p>
          {item.isPartnerEvent ? (
            <p className="min-w-0 break-words">
              {labels.hostedBy}: {item.hostName}
            </p>
          ) : null}
        </div>

        <p className="mt-3 line-clamp-3 min-h-[3.75rem] break-words text-sm leading-5 text-slate-600">
          {item.description || labels.noDescription}
        </p>

        <div className="mt-auto border-t border-[var(--border)] pt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
            <span>
              {labels.registration}: {item.attendeeCount}
              {item.capacity === null ? "" : ` / ${item.capacity}`}
            </span>
            {item.remainingSpaces !== null ? (
              <span>
                {labels.spacesRemaining}: {item.remainingSpaces}
              </span>
            ) : null}
          </div>
          <div
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="btn btn-secondary min-h-11 w-full sm:w-auto"
              onClick={(event) => onOpen(event.currentTarget)}
              type="button"
            >
              {labels.viewEvent}
            </button>
            <EventPrimaryAction item={item} labels={labels} />
          </div>
        </div>
      </div>
    </article>
  );
}

function categoryAccent(category: string | null) {
  const accents: Record<string, string> = {
    Academic: "#4f7cac",
    Arts: "#c06c84",
    Career: "#6672a8",
    Culture: "#8b6fa9",
    Leadership: "#c9853f",
    "Mental Health": "#658f8b",
    Outdoor: "#648b65",
    Social: "#b26f5b",
    Sports: "#d47b42",
    Volunteering: "#5b8f78",
  };

  return category ? accents[category] ?? "#b7793f" : "#b7793f";
}
