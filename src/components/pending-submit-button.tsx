"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useToast, type ToastVariant } from "@/components/toast-provider";

type PendingSubmitButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  children: ReactNode;
  pendingLabel: string;
  toastMessage?: string;
  toastVariant?: ToastVariant;
};

export function PendingSubmitButton({
  children,
  className = "",
  disabled,
  onClick,
  pendingLabel,
  toastMessage,
  toastVariant = "info",
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const toast = useToast();
  const isDisabled = disabled || pending;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (!event.defaultPrevented && toastMessage) {
      toast.notify({
        message: toastMessage,
        title: toast.labels[toastVariant],
        variant: toastVariant,
      });
    }
  }

  return (
    <button
      {...props}
      aria-busy={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      disabled={isDisabled}
      onClick={handleClick}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
