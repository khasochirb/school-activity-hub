"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  children: ReactNode;
  pendingLabel: string;
};

export function PendingSubmitButton({
  children,
  className = "",
  disabled,
  pendingLabel,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      {...props}
      aria-busy={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
      disabled={isDisabled}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
