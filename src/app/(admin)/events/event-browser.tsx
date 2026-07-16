"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { CategoryBadge, StatusBadge } from "../_components/page-ui";
import { cancelEventRegistration, joinEvent } from "./actions";

export type EventScheduleGroup = "later" | "past" | "thisWeek" | "today";

export type EventBrowserItem = {
  attendeeCount: number;
  canRegister: boolean;
  capacity: number | null;
  categoryLabel: string | null;
  categoryValue: string | null;
  dateBadgeLabel: string;
  dateTimeLabel: string;
  description: string | null;
  hasCurrentStudent: boolean;
  hostName: string;
  id: string;
  isFull: boolean;
  isOwnSchoolEvent: boolean;
  isStaff: boolean;
  location: string | null;
  permissionNote: string | null;
  permissionRequired: boolean;
  permissionStatusLabel: string | null;
  registrationStateLabel: string | null;
  registrationStatus: string | null;
  remainingSpaces: number | null;
  riskLabel: string;
  riskLevel: "high" | "low" | "medium";
  scheduleGroup: EventScheduleGroup;
  sharedLabel: string;
  status: string;
  statusLabel: string;
  title: string;
  visualInitials: string;
};

export type EventBrowserLabels = {
  attendanceQr: string;
  cancelRegistration: string;
  cancelling: string;
  capacity: string;
  checkedIn: string;
  close: string;
  dateTime: string;
  description: string;
  eventQuickView: string;
  hostedBy: string;
  joining: string;
  joinEvent: string;
  location: string;
  noDescription: string;
  noLimit: string;
  permission: string;
  permissionNote: string;
  permissionRequired: string;
  registration: string;
  registrationFull: string;
  riskLevel: string;
  safety: string;
  schedule: Record<EventScheduleGroup, string>;
  sharedEvent: string;
  spacesRemaining: string;
  viewEvent: string;
  viewFullDetails: string;
};

export function EventBrowser({
  items,
  labels,
  view,
}: {
  items: EventBrowserItem[];
  labels: EventBrowserLabels;
  view: "list" | "schedule";
}) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const titleId = useId();
  const selectedEvent = items.find((item) => item.id === selectedEventId);
  const scheduleGroups = useMemo(
    () =>
      (["today", "thisWeek", "later", "past"] as EventScheduleGroup[])
        .map((key) => ({
          items: items.filter((item) => item.scheduleGroup === key),
          key,
        }))
        .filter((group) => group.items.length > 0),
    [items],
  );

  const closeModal = useCallback(() => {
    setSelectedEventId(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }, []);

  function openModal(eventId: string, trigger?: HTMLButtonElement | null) {
    returnFocusRef.current = trigger ?? triggerRefs.current.get(eventId) ?? null;
    setSelectedEventId(eventId);
  }

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));

      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [closeModal, selectedEventId]);

  function renderCard(item: EventBrowserItem) {
    return (
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
    );
  }

  return (
    <>
      {view === "schedule" ? (
        <div className="space-y-3 p-3 sm:p-4">
          {scheduleGroups.map((group) => (
            <section
              className="rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-3 sm:p-4"
              key={group.key}
            >
              <div className="mb-3 flex min-w-0 items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <h3 className="min-w-0 break-words text-sm font-bold text-slate-950">
                  {labels.schedule[group.key]}
                </h3>
                <span className="badge shrink-0">{group.items.length}</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {group.items.map(renderCard)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-2">
          {items.map(renderCard)}
        </div>
      )}

      {selectedEvent
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeModal();
                }
              }}
              role="presentation"
            >
              <div
                aria-labelledby={titleId}
                aria-modal="true"
                className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl"
                ref={dialogRef}
                role="dialog"
              >
                <div className="flex min-w-0 items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--primary-strong)]">
                      {labels.eventQuickView}
                    </p>
                    <h2
                      className="mt-1 break-words text-xl font-bold leading-tight text-slate-950 sm:text-2xl"
                      id={titleId}
                    >
                      {selectedEvent.title}
                    </h2>
                  </div>
                  <button
                    className="btn btn-secondary min-h-10 shrink-0 px-3"
                    onClick={closeModal}
                    ref={closeButtonRef}
                    type="button"
                  >
                    {labels.close}
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.categoryLabel ? (
                      <CategoryBadge>{selectedEvent.categoryLabel}</CategoryBadge>
                    ) : null}
                    <StatusBadge status={selectedEvent.status}>
                      {selectedEvent.statusLabel}
                    </StatusBadge>
                    <StatusBadge variant={riskBadgeVariant(selectedEvent.riskLevel)}>
                      {selectedEvent.riskLabel}
                    </StatusBadge>
                    {selectedEvent.permissionRequired ? (
                      <StatusBadge variant="warning">{labels.permissionRequired}</StatusBadge>
                    ) : null}
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ModalDetail label={labels.dateTime} value={selectedEvent.dateTimeLabel} />
                    <ModalDetail label={labels.location} value={selectedEvent.location || "-"} />
                    <ModalDetail label={labels.hostedBy} value={selectedEvent.hostName} />
                    <ModalDetail label={labels.registration} value={selectedEvent.registrationStateLabel || selectedEvent.sharedLabel} />
                  </dl>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Metric label={labels.registration} value={String(selectedEvent.attendeeCount)} />
                    <Metric
                      label={labels.capacity}
                      value={selectedEvent.capacity === null ? labels.noLimit : String(selectedEvent.capacity)}
                    />
                    <Metric
                      label={labels.spacesRemaining}
                      value={selectedEvent.remainingSpaces === null ? labels.noLimit : String(selectedEvent.remainingSpaces)}
                    />
                  </div>

                  <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-4">
                    <h3 className="text-sm font-bold text-slate-950">{labels.description}</h3>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                      {selectedEvent.description || labels.noDescription}
                    </p>
                  </section>

                  <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-4">
                    <h3 className="text-sm font-bold text-slate-950">{labels.safety}</h3>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <ModalDetail label={labels.riskLevel} value={selectedEvent.riskLabel} />
                      <ModalDetail
                        label={labels.permission}
                        value={selectedEvent.permissionStatusLabel || (selectedEvent.permissionRequired ? labels.permissionRequired : "-")}
                      />
                    </dl>
                    {selectedEvent.permissionNote ? (
                      <div className="mt-3 border-t border-[var(--border)] pt-3">
                        <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
                          {labels.permissionNote}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                          {selectedEvent.permissionNote}
                        </p>
                      </div>
                    ) : null}
                  </section>
                </div>

                <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <Link
                      className="btn btn-secondary min-h-11 w-full sm:w-auto"
                      href={`/events/${selectedEvent.id}`}
                    >
                      {labels.viewFullDetails}
                    </Link>
                    <EventPrimaryAction
                      item={selectedEvent}
                      labels={labels}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
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
          {item.categoryLabel ? <CategoryBadge>{item.categoryLabel}</CategoryBadge> : null}
          <StatusBadge status={item.status}>{item.statusLabel}</StatusBadge>
          {item.permissionRequired ? (
            <StatusBadge variant="warning">{labels.permissionRequired}</StatusBadge>
          ) : null}
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">{item.dateTimeLabel}</p>
          <p className="min-w-0 break-words">{item.location || "-"}</p>
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
              <span>{labels.spacesRemaining}: {item.remainingSpaces}</span>
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

function EventPrimaryAction({
  item,
  labels,
}: {
  item: EventBrowserItem;
  labels: EventBrowserLabels;
}) {
  const widthClass = "w-full sm:w-auto";

  if (item.status !== "approved") {
    return (
      <span className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--card-soft)] px-3 text-center text-sm font-bold text-slate-700 ${widthClass}`}>
        {item.statusLabel}
      </span>
    );
  }

  if (item.isStaff && item.isOwnSchoolEvent) {
    return (
      <Link
        className={`btn btn-primary min-h-11 ${widthClass}`}
        href={`/events/${item.id}/attendance`}
      >
        {labels.attendanceQr}
      </Link>
    );
  }

  if (item.isStaff) {
    return (
      <span className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--card-soft)] px-3 text-center text-sm font-bold text-slate-700 ${widthClass}`}>
        {labels.sharedEvent}
      </span>
    );
  }

  if (!item.hasCurrentStudent) {
    return null;
  }

  if (item.registrationStatus === "registered") {
    return (
      <form action={cancelEventRegistration} className={widthClass}>
        <input name="event_id" type="hidden" value={item.id} />
        <PendingSubmitButton
          className="btn btn-secondary min-h-11 w-full"
          pendingLabel={labels.cancelling}
          toastMessage={labels.cancelling}
        >
          {labels.cancelRegistration}
        </PendingSubmitButton>
      </form>
    );
  }

  if (item.registrationStatus === "attended") {
    return (
      <span className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-center text-sm font-bold text-emerald-700 ${widthClass}`}>
        {labels.checkedIn}
      </span>
    );
  }

  if (!item.canRegister) {
    return (
      <span className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--card-soft)] px-3 text-center text-sm font-bold text-slate-700 ${widthClass}`}>
        {item.registrationStateLabel}
      </span>
    );
  }

  return (
    <form action={joinEvent} className={widthClass}>
      <input name="event_id" type="hidden" value={item.id} />
      <PendingSubmitButton
        className="btn btn-primary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
        disabled={item.isFull}
        pendingLabel={labels.joining}
        toastMessage={labels.joining}
      >
        {item.isFull ? labels.registrationFull : labels.joinEvent}
      </PendingSubmitButton>
    </form>
  );
}

function ModalDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900">{value}</dd>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function riskBadgeVariant(riskLevel: EventBrowserItem["riskLevel"]) {
  if (riskLevel === "high") {
    return "danger" as const;
  }

  return riskLevel === "medium" ? ("warning" as const) : ("success" as const);
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
