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
  endsAt: string;
  isMyClubEvent: boolean;
  isPartnerEvent: boolean;
  posterDay: string;
  posterMonth: string;
  posterUrl: string | null;
  startsAt: string;
  visualInitials: string;
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
      <div className="space-y-4 p-3 sm:p-4">
        {items.map((item) => (
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

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, form, input, select, textarea")) return;
    onOpen();
  }

  return (
    <article
      className="interactive-card group grid min-w-0 cursor-pointer overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--card-shadow)] focus-within:border-[var(--primary)] md:grid-cols-[minmax(13rem,0.85fr)_minmax(0,2fr)]"
      data-category-tone={categoryTone}
      onClick={handleCardClick}
    >
      <div
        className="relative aspect-[16/10] min-h-0 min-w-0 overflow-hidden border-b border-[var(--border)] bg-[var(--card-soft)] md:aspect-[4/5] md:border-b-0 md:border-r"
        data-category-tone={categoryTone}
      >
        {hasPoster && item.posterUrl ? (
          <Image
            alt={labels.posterAlt.replace("{event}", item.title)}
            className="object-cover"
            fill
            onError={() => setPosterFailed(true)}
            sizes="(max-width: 767px) 100vw, (max-width: 1200px) 34vw, 320px"
            src={item.posterUrl}
            unoptimized
          />
        ) : (
          <div
            aria-label={labels.noPoster}
            className="event-card-poster-fallback flex h-full w-full flex-col items-center justify-center gap-3 px-5 text-center"
            role="img"
          >
            <span
              aria-hidden="true"
              className="event-card-category-mark flex h-16 w-16 items-center justify-center rounded-2xl border text-xl font-black"
            >
              {item.visualInitials}
            </span>
            <span className="max-w-48 break-words text-sm font-semibold text-slate-700">
              {labels.noPoster}
            </span>
          </div>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-4 pt-12 text-white"
        >
          <span className="text-4xl font-black leading-none drop-shadow-sm">
            {item.posterDay}
          </span>
          <span className="rounded-md bg-black/45 px-2 py-1 text-sm font-bold uppercase backdrop-blur-sm">
            {item.posterMonth}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">
          <span className="min-w-0 break-words">{item.hostName}</span>
          <span aria-hidden="true">&middot;</span>
          <span className="break-words">{item.dateTimeLabel}</span>
        </div>

        <Link
          className="mt-2 w-fit max-w-full break-words text-xl font-black leading-tight text-slate-950 hover:text-[var(--primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:text-2xl"
          href={`/events/${item.id}`}
        >
          {item.title}
        </Link>

        <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-slate-600">
          {item.description || labels.noDescription}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {item.categoryLabel ? (
            <CategoryBadge category={item.categoryValue}>
              {item.categoryLabel}
            </CategoryBadge>
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

        <dl className="mt-4 grid min-w-0 gap-3 border-y border-[var(--border)] py-3 text-sm sm:grid-cols-3">
          <CardDetail label={labels.location} value={item.location || "-"} />
          <CardDetail label={labels.cost} value={item.costLabel} />
          <CardDetail
            label={labels.registration}
            value={`${item.attendeeCount}${
              item.capacity === null ? "" : ` / ${item.capacity}`
            }`}
          />
        </dl>

        <div className="mt-auto pt-4">
          <div className="mb-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
            {item.remainingSpaces !== null ? (
              <span className="break-words">
                {labels.spacesRemaining}: {item.remainingSpaces}
              </span>
            ) : null}
            {item.registrationStateLabel ? (
              <span className="break-words">{item.registrationStateLabel}</span>
            ) : null}
          </div>
          <div
            className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="btn btn-secondary min-h-11 w-full sm:w-auto"
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
        </div>
      </div>
    </article>
  );
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
