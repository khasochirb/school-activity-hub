import Link from "next/link";
import { SearchField, SelectFilter } from "../_components/page-ui";

export type EventsFilterOption = {
  label: string;
  value: string;
};

export type EventsActiveFilter = {
  href: string;
  label: string;
};

export type EventsFiltersLabels = {
  audience: string;
  category: string;
  clear: string;
  filter: string;
  hideFilters: string;
  search: string;
  searchEvents: string;
  showFilters: string;
  status: string;
  time: string;
};

export function EventsFilters({
  activeFilters,
  audienceOptions,
  categoryOptions,
  clearHref,
  labels,
  month,
  resultCountLabel,
  searchQuery,
  selectedAudience,
  selectedCategory,
  selectedStatus,
  selectedTime,
  statusOptions,
  timeOptions,
  view,
  week,
}: {
  activeFilters: EventsActiveFilter[];
  audienceOptions: EventsFilterOption[];
  categoryOptions: EventsFilterOption[];
  clearHref: string;
  labels: EventsFiltersLabels;
  month: string;
  resultCountLabel: string;
  searchQuery: string;
  selectedAudience: string;
  selectedCategory: string;
  selectedStatus: string;
  selectedTime: string;
  statusOptions: EventsFilterOption[];
  timeOptions: EventsFilterOption[];
  view: "list" | "month" | "week";
  week: string;
}) {
  return (
    <section className="section-card section-card-padded min-w-0">
      <details className="group min-w-0">
        <summary className="btn btn-secondary min-h-11 w-full cursor-pointer list-none justify-between md:hidden">
          <span className="group-open:hidden">{labels.showFilters}</span>
          <span className="hidden group-open:inline">{labels.hideFilters}</span>
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
        </summary>

        <div className="mt-3 hidden min-w-0 group-open:block md:mt-0 md:block">
          <form action="/events" className="compact-filter-grid">
            <SearchField
              defaultValue={searchQuery}
              label={labels.search}
              placeholder={labels.searchEvents}
            />
            <SelectFilter
              defaultValue={selectedAudience}
              label={labels.audience}
              name="scope"
              options={audienceOptions}
            />
            <SelectFilter
              defaultValue={selectedTime}
              label={labels.time}
              name="time"
              options={timeOptions}
            />
            {categoryOptions.length ? (
              <SelectFilter
                defaultValue={selectedCategory}
                label={labels.category}
                name="category"
                options={categoryOptions}
              />
            ) : null}
            {statusOptions.length ? (
              <SelectFilter
                defaultValue={selectedStatus}
                label={labels.status}
                name="status"
                options={statusOptions}
              />
            ) : null}
            {view === "month" ? (
              <>
                <input name="view" type="hidden" value="month" />
                <input name="month" type="hidden" value={month} />
              </>
            ) : view === "week" ? (
              <>
                <input name="view" type="hidden" value="week" />
                <input name="week" type="hidden" value={week} />
              </>
            ) : null}
            <div className="compact-filter-actions">
              <button className="btn btn-primary min-h-11 md:min-h-10" type="submit">
                {labels.filter}
              </button>
              <Link className="btn btn-secondary min-h-11 md:min-h-10" href={clearHref}>
                {labels.clear}
              </Link>
            </div>
          </form>
        </div>
      </details>

      {activeFilters.length ? (
        <div className="mt-3 flex min-w-0 flex-wrap gap-2" aria-label={labels.filter}>
          {activeFilters.map((filter) => (
            <Link
              aria-label={`${labels.clear}: ${filter.label}`}
              className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full border border-[#f2af68]/60 bg-[var(--primary-soft)] px-3 py-1 text-sm font-bold text-[var(--primary-strong)] transition hover:border-[#f2af68] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2af68]"
              href={filter.href}
              key={`${filter.label}-${filter.href}`}
            >
              <span className="min-w-0 break-words">{filter.label}</span>
              <span aria-hidden="true">&times;</span>
            </Link>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-sm font-semibold text-slate-600">
        {resultCountLabel}
      </p>
    </section>
  );
}
