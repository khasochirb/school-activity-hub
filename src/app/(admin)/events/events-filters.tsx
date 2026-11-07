import Link from "next/link";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { getActivityCategoryTone } from "@/lib/activity-category-styles";
import { SearchField, SelectFilter } from "../_components/page-ui";

export type EventsFilterOption = {
  label: string;
  value: string;
};

export type EventsChipLink = {
  active: boolean;
  category?: string;
  href: string;
  label: string;
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
  school: string;
  showFilters: string;
  status: string;
  time: string;
};

export function EventsFilters({
  activeFilters,
  audienceLinks,
  categoryLinks,
  clearHref,
  labels,
  month,
  resultCountLabel,
  searchQuery,
  selectedAudience,
  selectedCategory,
  selectedStatus,
  selectedSchool,
  selectedTime,
  statusOptions,
  schoolOptions,
  timeContextMessage,
  timeOptions,
  view,
  week,
}: {
  activeFilters: EventsActiveFilter[];
  audienceLinks: EventsChipLink[];
  categoryLinks: EventsChipLink[];
  clearHref: string;
  labels: EventsFiltersLabels;
  month: string;
  resultCountLabel: string;
  searchQuery: string;
  selectedAudience: string;
  selectedCategory: string;
  selectedStatus: string;
  selectedSchool: string;
  selectedTime: string;
  statusOptions: EventsFilterOption[];
  schoolOptions: EventsFilterOption[];
  timeContextMessage?: string;
  timeOptions: EventsFilterOption[];
  view: "list" | "month" | "week";
  week: string;
}) {
  return (
    <section className="events-filters min-w-0">
      <ChipRow label={labels.audience} links={audienceLinks} />
      {categoryLinks.length > 1 ? (
        <ChipRow label={labels.category} links={categoryLinks} />
      ) : null}
      <form action="/events" className="events-filter-form">
        <SearchField
          defaultValue={searchQuery}
          label={labels.search}
          placeholder={labels.searchEvents}
        />
        <details className="events-filter-details animated-native-details group min-w-0">
          <summary className="events-filter-toggle">
            <span className="group-open:hidden">{labels.showFilters}</span>
            <span className="hidden group-open:inline">{labels.hideFilters}</span>
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
          </summary>
          <div className="events-filter-more">
            {schoolOptions.length ? (
              <SelectFilter
                defaultValue={selectedSchool}
                label={labels.school}
                name="school"
                options={schoolOptions}
              />
            ) : null}
            <input name="scope" type="hidden" value={selectedAudience} />
            {selectedCategory ? (
              <input name="category" type="hidden" value={selectedCategory} />
            ) : null}
            {view === "month" ? (
              <input name="time" type="hidden" value={selectedTime} />
            ) : (
              <SelectFilter
                defaultValue={selectedTime}
                label={labels.time}
                name="time"
                options={timeOptions}
              />
            )}
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
              <button className="btn btn-secondary min-h-11 md:min-h-10" type="submit">
                {labels.filter}
              </button>
              <Link
                className="btn btn-secondary min-h-11 gap-2 md:min-h-10"
                href={clearHref}
                prefetch={false}
              >
                {labels.clear}
                <PendingLinkIndicator />
              </Link>
            </div>
          </div>
        </details>
      </form>

      {activeFilters.length ? (
        <div className="flex min-w-0 flex-wrap gap-2" aria-label={labels.filter}>
          {activeFilters.map((filter) => (
            <Link
              aria-label={`${labels.clear}: ${filter.label}`}
              className="interactive-chip inline-flex min-h-9 max-w-full items-center gap-1 rounded-full border border-[var(--primary)]/60 bg-[var(--primary-soft)] px-3 py-1 text-sm font-bold text-[var(--primary-strong)] hover:border-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              href={filter.href}
              key={`${filter.label}-${filter.href}`}
              prefetch={false}
            >
              <span className="min-w-0 break-words">{filter.label}</span>
              <span aria-hidden="true">&times;</span>
            </Link>
          ))}
        </div>
      ) : null}

      {timeContextMessage ? (
        <p className="text-sm text-slate-600">{timeContextMessage}</p>
      ) : null}

      <p className="text-sm font-semibold text-slate-600">
        {resultCountLabel}
      </p>
    </section>
  );
}

function ChipRow({ label, links }: { label: string; links: EventsChipLink[] }) {
  return (
    <nav aria-label={label} className="events-chip-row">
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              aria-current={link.active ? "page" : undefined}
              className="events-chip"
              data-category-tone={
                link.category ? getActivityCategoryTone(link.category) : undefined
              }
              href={link.href}
              prefetch={false}
            >
              {link.category ? <i aria-hidden="true" /> : null}
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
