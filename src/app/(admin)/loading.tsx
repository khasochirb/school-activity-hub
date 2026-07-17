export default function AdminLoading() {
  return (
    <div className="page-stack" aria-busy="true" aria-live="polite">
      <section className="page-header">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32 rounded-full" />
          <Skeleton className="h-9 w-full max-w-md rounded-md" />
          <Skeleton className="h-4 w-full max-w-2xl rounded-full" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="section-card section-card-padded space-y-3"
            key={index}
          >
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </section>

      <section className="section-card section-card-padded space-y-3">
        <Skeleton className="h-5 w-40 rounded-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
      </section>
    </div>
  );
}

function Skeleton({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-[var(--border)] motion-reduce:animate-none ${className}`}
    />
  );
}
