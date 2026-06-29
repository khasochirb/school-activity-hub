export default function AdminLoading() {
  return (
    <div className="page-stack" aria-busy="true" aria-live="polite">
      <section className="page-header">
        <div className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="h-9 w-full max-w-md animate-pulse rounded-md bg-slate-200" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-200" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="section-card section-card-padded space-y-3"
            key={index}
          >
            <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
            <div className="h-8 w-16 animate-pulse rounded-md bg-slate-200" />
          </div>
        ))}
      </section>

      <section className="section-card section-card-padded space-y-3">
        <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="h-24 w-full animate-pulse rounded-md bg-slate-200" />
      </section>
    </div>
  );
}
