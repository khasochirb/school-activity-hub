"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/toast-provider";

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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isDisabled = disabled || pending;

  function handleConfirm() {
    const form = buttonRef.current?.form;

    setIsOpen(false);
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
        onClick={() => setIsOpen(true)}
        ref={buttonRef}
        type="button"
      >
        {pending ? pendingLabel : children}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="section-card w-full max-w-sm p-5 shadow-2xl"
            role="dialog"
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
                onClick={() => setIsOpen(false)}
                type="button"
              >
                {cancelLabel}
              </button>
              <button
                className="btn btn-primary h-10"
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
