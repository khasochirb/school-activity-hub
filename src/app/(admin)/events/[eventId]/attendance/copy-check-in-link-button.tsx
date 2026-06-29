"use client";

import { useState } from "react";

export function CopyCheckInLinkButton({
  labels,
  url,
}: {
  labels: {
    copied: string;
    copy: string;
  };
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      className="btn btn-secondary min-h-11 w-full sm:w-auto"
      onClick={copyLink}
      type="button"
    >
      {copied ? labels.copied : labels.copy}
    </button>
  );
}
