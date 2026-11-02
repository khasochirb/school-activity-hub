"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      className="btn btn-primary min-h-11 px-5"
      onClick={() => window.print()}
      type="button"
    >
      {label}
    </button>
  );
}
