"use client";

import { startTransition, type FormEvent } from "react";

// React clears a <form action={...}> after every submit, even when the server
// answers with an error, so one mistake wipes everything the person typed.
// Submitting through onSubmit instead keeps the fields; forms that should
// clear after success do so themselves.
export function submitKeepingInput(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter instanceof HTMLElement ? submitter : null);

    startTransition(() => action(formData));
  };
}
