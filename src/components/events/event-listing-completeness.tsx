import type {
  EventCompletenessItemId,
  EventListingCompleteness,
} from "@/lib/events/event-listing-completeness";

export type EventCompletenessLabels = {
  detailsCompleted: string;
  listingCompleteness: string;
  missingInformation: string;
  needsMoreDetails: string;
  readyToPublish: string;
};

export function EventCompletenessBadge({
  labels,
  result,
}: {
  labels: EventCompletenessLabels;
  result: EventListingCompleteness;
}) {
  const statusLabel =
    result.status === "ready"
      ? labels.readyToPublish
      : labels.needsMoreDetails;

  return (
    <span
      aria-label={`${labels.listingCompleteness}: ${statusLabel}, ${result.percentage}%`}
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-snug whitespace-normal ${
        result.status === "ready"
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
      }`}
    >
      {statusLabel} - {result.percentage}%
    </span>
  );
}

export function EventCompletenessChecklist({
  itemLabels,
  labels,
  live = false,
  onSelectMissingItem,
  result,
}: {
  itemLabels: Record<EventCompletenessItemId, string>;
  labels: EventCompletenessLabels;
  live?: boolean;
  onSelectMissingItem?: (item: EventCompletenessItemId) => void;
  result: EventListingCompleteness;
}) {
  return (
    <section
      aria-live={live ? "polite" : undefined}
      className="rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold text-slate-950">
            {labels.listingCompleteness}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {result.completedCount}/{result.applicableCount} {labels.detailsCompleted}
          </p>
        </div>
        <EventCompletenessBadge labels={labels} result={result} />
      </div>

      {result.completedItems.length ? (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase text-slate-500">
            {labels.detailsCompleted}
          </h4>
          <ul className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
            {result.completedItems.map((item) => (
              <li className="min-w-0 break-words" key={item}>
                <span aria-hidden="true">+ </span>
                {itemLabels[item]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.missingItems.length ? (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase text-slate-500">
            {labels.missingInformation}
          </h4>
          <ul className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
            {result.missingItems.map((item) => (
              <li className="min-w-0" key={item}>
                {onSelectMissingItem ? (
                  <button
                    className="min-h-9 max-w-full cursor-pointer break-words rounded-md px-2 py-1 text-left font-medium text-amber-800 outline-none transition hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-[var(--primary)] dark:text-amber-200 dark:hover:bg-amber-950/30"
                    onClick={() => onSelectMissingItem(item)}
                    type="button"
                  >
                    <span aria-hidden="true">- </span>
                    {itemLabels[item]}
                  </button>
                ) : (
                  <span className="break-words">
                    <span aria-hidden="true">- </span>
                    {itemLabels[item]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
