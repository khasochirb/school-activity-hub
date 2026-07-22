"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CategoryBadge, StatusBadge } from "@/app/(admin)/_components/page-ui";
import { cancelEventRegistration, joinEvent } from "@/app/(admin)/events/actions";
import {
  EventCalendarActions,
  type EventCalendarActionLabels,
} from "@/components/events/event-calendar-actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import {
  MOTION_NORMAL_MS,
  motionDuration,
} from "@/lib/ui/motion";

export type EventQuickViewItem = {
  accessibilityLabel: string;
  attendeeCount: number;
  canRegister: boolean;
  canManageEvent: boolean;
  calendarDownloadUrl: string;
  capacity: number | null;
  categoryLabel: string | null;
  categoryValue: string | null;
  costLabel: string;
  costNotes: string | null;
  costType: "free" | "paid" | "variable" | null;
  dateTimeLabel: string;
  description: string | null;
  eligibilityLabel: string;
  experienceLabel: string;
  experienceLevel:
    | "beginner_friendly"
    | "prior_experience_recommended"
    | null;
  expectedCommitmentLabel: string;
  hasCurrentStudent: boolean;
  hasEligibilityInfo: boolean;
  googleCalendarUrl: string;
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
  cancellationNotice: string | null;
  responsibleAdultLabel: string;
  requiredMaterialsLabel: string;
  sharedLabel: string;
  schoolName: string;
  status: string;
  statusLabel: string;
  title: string;
};

export type EventQuickViewLabels = EventCalendarActionLabels & {
  accessibility: string;
  attendanceQr: string;
  cancelRegistration: string;
  cancelling: string;
  capacity: string;
  checkedIn: string;
  close: string;
  dateTime: string;
  description: string;
  cost: string;
  costNotes: string;
  eventQuickView: string;
  eligibility: string;
  experienceLevel: string;
  hostedBy: string;
  joining: string;
  joinEvent: string;
  location: string;
  noDescription: string;
  noLimit: string;
  permission: string;
  permissionNote: string;
  permissionRequired: string;
  practicalDetails: string;
  participationInformation: string;
  registration: string;
  registrationFull: string;
  requiredMaterials: string;
  riskLevel: string;
  cancellationNotice: string;
  scheduleUpdate: string;
  expectedCommitment: string;
  responsibleAdult: string;
  safety: string;
  sharedEvent: string;
  spacesRemaining: string;
  viewEvent: string;
  viewFullDetails: string;
};

export function EventQuickViewModal({
  event,
  labels,
  onClose,
  returnFocusRef,
}: {
  event: EventQuickViewItem | null;
  labels: EventQuickViewLabels;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const titleId = useId();

  const closeModal = useCallback(() => {
    if (closeTimerRef.current !== null) {
      return;
    }

    const closeDuration = motionDuration(MOTION_NORMAL_MS);

    if (closeDuration > 0) {
      setIsClosing(true);
    }

    closeTimerRef.current = window.setTimeout(() => {
      onClose();
      setIsClosing(false);
      closeTimerRef.current = null;
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    }, closeDuration);
  }, [onClose, returnFocusRef]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!event) {
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

    function handleKeyDown(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        closeModal();
        return;
      }

      if (keyboardEvent.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("hidden"));

      if (!focusableElements.length) {
        keyboardEvent.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (keyboardEvent.shiftKey && document.activeElement === firstElement) {
        keyboardEvent.preventDefault();
        lastElement.focus();
      } else if (
        !keyboardEvent.shiftKey &&
        document.activeElement === lastElement
      ) {
        keyboardEvent.preventDefault();
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
  }, [closeModal, event]);

  if (!event) {
    return null;
  }

  return createPortal(
    <div
      className={`overlay-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4 ${
        isClosing ? "overlay-backdrop-closing" : ""
      }`}
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) {
          closeModal();
        }
      }}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={`overlay-panel overlay-panel-sheet flex max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl ${
          isClosing ? "overlay-panel-closing" : ""
        }`}
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
              {event.title}
            </h2>
          </div>
          <button
            className="btn btn-secondary min-h-10 shrink-0 px-3"
            disabled={isClosing}
            onClick={closeModal}
            ref={closeButtonRef}
            type="button"
          >
            {labels.close}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {event.categoryLabel ? (
              <CategoryBadge category={event.categoryValue}>
                {event.categoryLabel}
              </CategoryBadge>
            ) : null}
            <StatusBadge status={event.status}>{event.statusLabel}</StatusBadge>
            <StatusBadge variant={riskBadgeVariant(event.riskLevel)}>
              {event.riskLabel}
            </StatusBadge>
            {event.permissionRequired ? (
              <StatusBadge variant="warning">
                {labels.permissionRequired}
              </StatusBadge>
            ) : null}
            {event.experienceLevel ? (
              <StatusBadge variant="info">{event.experienceLabel}</StatusBadge>
            ) : null}
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <ModalDetail label={labels.dateTime} value={event.dateTimeLabel} />
            <ModalDetail label={labels.location} value={event.location || "-"} />
            <ModalDetail label={labels.hostedBy} value={event.hostName} />
            <ModalDetail
              label={labels.registration}
              value={event.registrationStateLabel || event.sharedLabel}
            />
          </dl>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label={labels.registration} value={String(event.attendeeCount)} />
            <Metric
              label={labels.capacity}
              value={event.capacity === null ? labels.noLimit : String(event.capacity)}
            />
            <Metric
              label={labels.spacesRemaining}
              value={
                event.remainingSpaces === null
                  ? labels.noLimit
                  : String(event.remainingSpaces)
              }
            />
          </div>

          <div className="mt-4">
            <EventCalendarActions
              calendarDownloadUrl={event.calendarDownloadUrl}
              googleCalendarUrl={event.googleCalendarUrl}
              labels={labels}
              showRegisteredSuggestion={
                event.registrationStatus === "registered" ||
                event.registrationStatus === "attended"
              }
            />
          </div>

          {event.cancellationNotice ? (
            <section className="mt-4 rounded-lg border border-amber-400/70 bg-amber-50 p-4 dark:bg-amber-950/25">
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                {labels.scheduleUpdate}
              </h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-amber-900 dark:text-amber-100">
                {event.cancellationNotice}
              </p>
            </section>
          ) : null}

          <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-4">
            <h3 className="text-sm font-bold text-slate-950">
              {labels.description}
            </h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
              {event.description || labels.noDescription}
            </p>
          </section>

          <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-4">
            <h3 className="text-sm font-bold text-slate-950">
              {labels.practicalDetails}
            </h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <ModalDetail label={labels.cost} value={event.costLabel} />
              <ModalDetail
                label={labels.requiredMaterials}
                value={event.requiredMaterialsLabel}
              />
              <ModalDetail
                label={labels.expectedCommitment}
                value={event.expectedCommitmentLabel}
              />
              {event.costNotes ? (
                <ModalDetail label={labels.costNotes} value={event.costNotes} />
              ) : null}
            </dl>
          </section>

          <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-4">
            <h3 className="text-sm font-bold text-slate-950">
              {labels.participationInformation}
            </h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <ModalDetail
                label={labels.responsibleAdult}
                value={event.responsibleAdultLabel}
              />
              <ModalDetail
                label={labels.experienceLevel}
                value={event.experienceLabel}
              />
              <ModalDetail
                label={labels.eligibility}
                value={event.eligibilityLabel}
              />
              <ModalDetail
                label={labels.accessibility}
                value={event.accessibilityLabel}
              />
            </dl>
          </section>

          <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-4">
            <h3 className="text-sm font-bold text-slate-950">{labels.safety}</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <ModalDetail label={labels.riskLevel} value={event.riskLabel} />
              <ModalDetail
                label={labels.permission}
                value={
                  event.permissionStatusLabel ||
                  (event.permissionRequired ? labels.permissionRequired : "-")
                }
              />
            </dl>
            {event.permissionNote ? (
              <div className="mt-3 border-t border-[var(--border)] pt-3">
                <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
                  {labels.permissionNote}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                  {event.permissionNote}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Link
              className="btn btn-secondary min-h-11 w-full sm:w-auto"
              href={`/events/${event.id}`}
              prefetch={false}
            >
              {labels.viewFullDetails}
            </Link>
            <EventPrimaryAction item={event} labels={labels} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function EventPrimaryAction({
  item,
  labels,
}: {
  item: EventQuickViewItem;
  labels: EventQuickViewLabels;
}) {
  const widthClass = "w-full sm:w-auto";

  if (item.status !== "approved") {
    return (
      <span
        className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--card-soft)] px-3 text-center text-sm font-bold text-slate-700 ${widthClass}`}
      >
        {item.statusLabel}
      </span>
    );
  }

  if (item.isStaff && item.canManageEvent) {
    return (
      <Link
        className={`btn btn-primary min-h-11 ${widthClass}`}
        href={`/events/${item.id}/attendance`}
        prefetch={false}
      >
        {labels.attendanceQr}
      </Link>
    );
  }

  if (item.isStaff) {
    return (
      <span
        className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--card-soft)] px-3 text-center text-sm font-bold text-slate-700 ${widthClass}`}
      >
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
      <span
        className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-center text-sm font-bold text-emerald-700 ${widthClass}`}
      >
        {labels.checkedIn}
      </span>
    );
  }

  if (!item.canRegister) {
    return (
      <span
        className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--card-soft)] px-3 text-center text-sm font-bold text-slate-700 ${widthClass}`}
      >
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
      <dt className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-5 text-slate-900">
        {value}
      </dd>
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

function riskBadgeVariant(riskLevel: EventQuickViewItem["riskLevel"]) {
  if (riskLevel === "high") {
    return "danger" as const;
  }

  return riskLevel === "medium" ? ("warning" as const) : ("success" as const);
}
