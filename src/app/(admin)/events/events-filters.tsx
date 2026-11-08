import Link from "next/link";
import type { CSSProperties } from "react";
import { categoryColor } from "@/lib/ui/category-colors";
import { ActionMenu, type ActionMenuItem } from "../_components/action-menu";

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

// The draft's only filter UI: one row of chips, a menu for the rarer
// filters, and one search box.
export function EventsChipBar({
  categoryLinks,
  label,
  menuItems,
  menuLabel,
  timeLinks,
}: {
  categoryLinks: EventsChipLink[];
  label: string;
  menuItems: ActionMenuItem[];
  menuLabel: string;
  timeLinks: EventsChipLink[];
}) {
  return (
    <nav aria-label={label} className="cl-filters">
      {timeLinks.map((link) => (
        <Chip key={link.href} link={link} />
      ))}
      {categoryLinks.length > 1 ? (
        <>
          <span aria-hidden="true" className="cl-filters-divider" />
          {categoryLinks.map((link) => (
            <Chip key={link.href} link={link} />
          ))}
        </>
      ) : null}
      {menuItems.length ? (
        <span className="ml-auto">
          <ActionMenu
            buttonClassName="cl-chip"
            buttonLabel={menuLabel}
            items={menuItems}
            label={menuLabel}
          />
        </span>
      ) : null}
    </nav>
  );
}

function Chip({ link }: { link: EventsChipLink }) {
  return (
    <Link
      aria-current={link.active ? "page" : undefined}
      className="cl-chip"
      data-c={link.category ? "" : undefined}
      href={link.href}
      prefetch={false}
      style={
        link.category
          ? ({ "--c": categoryColor(link.category) } as CSSProperties)
          : undefined
      }
    >
      {link.label}
    </Link>
  );
}

export function EventsSearch({
  activeFilters,
  clearLabel,
  hidden,
  label,
  placeholder,
  searchQuery,
}: {
  activeFilters: EventsActiveFilter[];
  clearLabel: string;
  /** Current filters, carried over when a search is submitted. */
  hidden: Record<string, string>;
  label: string;
  placeholder: string;
  searchQuery: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <form action="/events" role="search">
        <label className="cl-search cl-search-wide">
          <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="sr-only">{label}</span>
          <input defaultValue={searchQuery} name="q" placeholder={placeholder} type="search" />
        </label>
        {Object.entries(hidden).map(([name, value]) =>
          value ? <input key={name} name={name} type="hidden" value={value} /> : null,
        )}
      </form>
      {activeFilters.length ? (
        <div aria-label={label} className="flex min-w-0 flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Link
              aria-label={`${clearLabel}: ${filter.label}`}
              className="cl-tag"
              data-tone="blue"
              href={filter.href}
              key={`${filter.label}-${filter.href}`}
              prefetch={false}
            >
              {filter.label} ×
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
