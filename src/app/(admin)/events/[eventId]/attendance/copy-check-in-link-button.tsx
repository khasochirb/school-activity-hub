"use client";

import { useState } from "react";

export function CopyCheckInLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
      onClick={copyLink}
      type="button"
    >
      {copied ? "Copied" : "Copy check-in link"}
    </button>
  );
}
