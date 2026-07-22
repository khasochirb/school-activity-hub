type SkeletonVariant = "dashboard" | "events" | "management";

export function PageLoadingSkeleton({
  variant = "management",
}: {
  variant?: SkeletonVariant;
}) {
  return (
    <div className="route-loading-skeleton page-stack" aria-busy="true">
      <PageHeadingSkeleton />
      {variant === "dashboard" ? <DashboardSkeleton /> : null}
      {variant === "events" ? <EventsSkeleton /> : null}
      {variant === "management" ? <ManagementSkeleton /> : null}
    </div>
  );
}

function PageHeadingSkeleton() {
  return (
    <section className="page-header" aria-hidden="true">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-11 w-full sm:w-40" />
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <section
        aria-hidden="true"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div className="section-card section-card-padded space-y-3" key={index}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </section>
      <ListAreaSkeleton columns={2} />
    </>
  );
}

function EventsSkeleton() {
  return (
    <>
      <FilterControlsSkeleton />
      <section
        aria-hidden="true"
        className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div className="section-card section-card-padded space-y-3" key={index}>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-32" />
          </div>
        ))}
      </section>
    </>
  );
}

function ManagementSkeleton() {
  return (
    <>
      <FilterControlsSkeleton />
      <ListAreaSkeleton columns={1} />
    </>
  );
}

function FilterControlsSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="section-card section-card-padded grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_minmax(10rem,1fr)_auto]"
    >
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full sm:w-32" />
    </section>
  );
}

function ListAreaSkeleton({ columns }: { columns: 1 | 2 }) {
  return (
    <section
      aria-hidden="true"
      className={`grid gap-3 ${columns === 2 ? "lg:grid-cols-2" : ""}`}
    >
      {Array.from({ length: columns === 2 ? 4 : 5 }, (_, index) => (
        <div
          className="section-card section-card-padded grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center"
          key={index}
        >
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </section>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`skeleton-block rounded-md ${className}`} />;
}
