"use client";

import { useToast } from "@/components/toast-provider";

// Students share a club through their own apps. The platform never sees who
// they send it to.
export function ShareClubButton({
  clubId,
  className = "btn btn-secondary min-h-11",
  labels,
  text,
  title,
}: {
  clubId: string;
  className?: string;
  labels: {
    copied: string;
    failed: string;
    share: string;
  };
  text: string;
  title: string;
}) {
  const { notify } = useToast();

  async function share() {
    const url = `${window.location.origin}/clubs/${clubId}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text, title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      notify({ message: labels.copied, variant: "success" });
    } catch {
      notify({ message: labels.failed, variant: "error" });
    }
  }

  return (
    <button className={className} onClick={share} type="button">
      {labels.share}
    </button>
  );
}
