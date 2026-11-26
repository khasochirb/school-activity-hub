// The School Activity Hub logo: a sun rising over a campus arc, inside the
// ink tile. Purely decorative, so the visible app name carries the label.
export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`brand-mark inline-flex shrink-0 items-center justify-center rounded-xl ${className}`}
    >
      <BrandGlyph />
    </span>
  );
}

// The logo artwork alone, for places that already provide the ink tile.
export function BrandGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-[62%] w-[62%]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="10" fill="var(--sun)" r="5" />
      <path
        d="M2.5 20.5c2.6-4.2 5.9-6.3 9.5-6.3s6.9 2.1 9.5 6.3"
        stroke="var(--primary)"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}
