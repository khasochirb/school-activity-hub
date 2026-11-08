import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { joinEvent } from "@/app/(admin)/events/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { categoryColor } from "@/lib/ui/category-colors";

// Building blocks of the approved "Clean" draft. Plain server components:
// headings sit on the page, content sits in hairline cards below them.

export const colorVar = (color: string) => ({ "--c": color }) as CSSProperties;

export function PageHead({
  action,
  subtitle,
  title,
}: {
  action?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="cl-head">
      <div className="min-w-0">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Section({
  children,
  link,
  title,
}: {
  children: ReactNode;
  link?: { href: string; label: string };
  title: string;
}) {
  return (
    <section className="cl-sec">
      <header>
        <h2>{title}</h2>
        {link ? (
          <Link href={link.href} prefetch={false}>
            {link.label}
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function Widget({
  children,
  link,
  title,
}: {
  children: ReactNode;
  link?: { href: string; label: string };
  title: string;
}) {
  return (
    <div className="cl-card cl-widget">
      <h3>{title}</h3>
      {children}
      {link ? (
        <Link className="cl-widget-link" href={link.href} prefetch={false}>
          {link.label} →
        </Link>
      ) : null}
    </div>
  );
}

export function CategoryLabel({
  category,
  label,
}: {
  category: string | null;
  label: string | null;
}) {
  if (!category || !label) return null;

  return (
    <span className="cl-cat" style={colorVar(categoryColor(category))}>
      {label}
    </span>
  );
}

/** Poster image, or the category colour with initials when there is none. */
export function Cover({
  category,
  className = "",
  imageUrl,
  initials,
}: {
  category: string | null;
  className?: string;
  imageUrl: string | null;
  initials: string;
}) {
  return (
    <span
      className={`cl-cover ${className}`}
      style={colorVar(categoryColor(category))}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" loading="lazy" src={imageUrl} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

export function ClubAvatar({
  category,
  logoUrl,
  name,
  size = 32,
}: {
  category: string | null;
  logoUrl?: string | null;
  name: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="cl-clubav"
      style={{
        ...colorVar(categoryColor(category)),
        fontSize: Math.round(size * 0.42),
        height: size,
        width: size,
      }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" src={logoUrl} />
      ) : (
        initialsOf(name).slice(0, 1)
      )}
    </span>
  );
}

export type CleanEventCardData = {
  attendeeCount: number;
  canJoin: boolean;
  capacity: number | null;
  categoryLabel: string | null;
  categoryValue: string | null;
  hostName: string;
  id: string;
  isFull: boolean;
  location: string | null;
  month: string;
  day: string;
  posterUrl: string | null;
  registrationStatus: string | null;
  title: string;
  whenLabel: string;
};

export type CleanEventCardLabels = {
  full: string;
  going: string;
  goingCount: string;
  join: string;
  joining: string;
  spotsLeft: string;
};

export function EventCard({
  action,
  event,
  labels,
}: {
  /** Replaces the Join button, e.g. a ⋯ menu for staff. */
  action?: ReactNode;
  event: CleanEventCardData;
  labels: CleanEventCardLabels;
}) {
  const going =
    event.registrationStatus === "registered" ||
    event.registrationStatus === "attended";
  const left =
    event.capacity !== null
      ? Math.max(event.capacity - event.attendeeCount, 0)
      : null;
  const href = `/events/${event.id}`;

  return (
    <article className="cl-card cl-ecard">
      <Link aria-label={event.title} className="cl-open" href={href} prefetch={false} />
      <Cover
        category={event.categoryValue}
        imageUrl={event.posterUrl}
        initials={initialsOf(event.hostName || event.title)}
      />
      <span aria-hidden="true" className="cl-dt">
        <span>{event.month}</span>
        <b>{event.day}</b>
      </span>
      {going ? (
        <span className="cl-st cl-tag" data-tone="ok">
          {labels.going}
        </span>
      ) : null}
      <div className="cl-bd">
        <CategoryLabel category={event.categoryValue} label={event.categoryLabel} />
        <Link className="cl-t relative z-[1] hover:text-[var(--primary-strong)]" href={href} prefetch={false}>
          {event.title}
        </Link>
        <span className="cl-s">
          {event.whenLabel}
          {event.location ? ` · ${event.location}` : ""}
        </span>
        {event.capacity ? (
          <div
            className="cl-bar"
            style={colorVar(
              left !== null && left < 5 ? "var(--cl-coral)" : categoryColor(event.categoryValue),
            )}
            title={labels.spotsLeft.replace("{count}", String(left ?? 0))}
          >
            <i
              style={{
                width: `${Math.min(100, Math.round((event.attendeeCount / event.capacity) * 100))}%`,
              }}
            />
          </div>
        ) : null}
        <div className="cl-ft">
          <span className="cl-s">
            <b>{event.attendeeCount}</b>{" "}
            {labels.goingCount}
            {left !== null ? ` · ${labels.spotsLeft.replace("{count}", String(left))}` : ""}
          </span>
          {action ?? null}
          {!action && !going && event.canJoin ? (
            <form action={joinEvent}>
              <input name="event_id" type="hidden" value={event.id} />
              <PendingSubmitButton
                className="cl-btn-soft disabled:cursor-not-allowed disabled:opacity-60"
                disabled={event.isFull}
                pendingLabel={labels.joining}
                toastMessage={labels.joining}
              >
                {event.isFull ? labels.full : labels.join}
              </PendingSubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export type WeekDay = {
  colors: string[];
  day: number;
  href: string;
  isToday: boolean;
  label: string;
};

export function WeekStrip({ days, label }: { days: WeekDay[]; label: string }) {
  return (
    <nav aria-label={label} className="cl-week">
      {days.map((day) => (
        <Link
          className="cl-day"
          data-today={day.isToday ? "" : undefined}
          href={day.href}
          key={`${day.label}-${day.day}`}
          prefetch={false}
        >
          <small>{day.label}</small>
          <b>{day.day}</b>
          <span aria-hidden="true" className="cl-dots">
            {day.colors.slice(0, 3).map((color, index) => (
              <i key={index} style={colorVar(color)} />
            ))}
          </span>
        </Link>
      ))}
    </nav>
  );
}

export function initialsOf(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (!words.length) return "?";

  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}
