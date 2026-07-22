"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/toast-provider";
import {
  MOTION_NORMAL_MS,
  motionDuration,
} from "@/lib/ui/motion";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type ConfirmSubmitButtonProps = {
  cancelLabel: string;
  children: ReactNode;
  className?: string;
  confirmDescription: string;
  confirmLabel: string;
  confirmTitle: string;
  disabled?: boolean;
  pendingLabel: string;
};

export function ConfirmSubmitButton({
  cancelLabel,
  children,
  className = "",
  confirmDescription,
  confirmLabel,
  confirmTitle,
  disabled,
  pendingLabel,
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const submitStartedRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const isDisabled = disabled || pending;

  const closeDialog = useCallback((restoreFocus = true) => {
    if (closeTimerRef.current !== null) {
      return;
    }

    const closeDuration = motionDuration(MOTION_NORMAL_MS);

    if (closeDuration > 0) {
      setIsClosing(true);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimerRef.current = null;
      submitStartedRef.current = false;

      if (restoreFocus) {
        window.requestAnimationFrame(() => buttonRef.current?.focus());
      }
    }, closeDuration);
  }, []);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );

      if (!focusableElements.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1) ?? firstElement;

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
    };
  }, [closeDialog, isOpen]);

  function handleConfirm() {
    if (submitStartedRef.current) {
      return;
    }

    const form = buttonRef.current?.form;

    submitStartedRef.current = true;
    closeDialog(false);
    toast.notify({
      message: pendingLabel,
      title: toast.labels.info,
      variant: "info",
    });
    form?.requestSubmit();
  }

  return (
    <>
      <button
        aria-busy={pending}
        className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
        disabled={isDisabled}
        onClick={() => {
          submitStartedRef.current = false;
          setIsClosing(false);
          setIsOpen(true);
        }}
        ref={buttonRef}
        type="button"
      >
        {pending ? pendingLabel : children}
      </button>

      {isOpen ? (
        <div
          className={`overlay-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm ${
            isClosing ? "overlay-backdrop-closing" : ""
          }`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
          role="presentation"
        >
          <div
            aria-busy={pending || isClosing}
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className={`overlay-panel section-card w-full max-w-sm p-5 shadow-2xl ${
              isClosing ? "overlay-panel-closing" : ""
            }`}
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <h2 className="text-lg font-semibold text-zinc-950" id={titleId}>
              {confirmTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600" id={descriptionId}>
              {confirmDescription}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="btn btn-secondary h-10"
                disabled={isClosing}
                onClick={() => closeDialog()}
                ref={cancelButtonRef}
                type="button"
              >
                {cancelLabel}
              </button>
              <button
                className="btn btn-primary h-10"
                disabled={pending || isClosing}
                onClick={handleConfirm}
                type="button"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
