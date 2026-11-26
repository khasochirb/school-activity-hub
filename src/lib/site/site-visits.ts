// Pure rules for the school site visit counter. No imports, so tests load it as is.

// Crawlers, link previews and headless browsers are not visits.
const NOT_A_VISITOR =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|monitor|curl|wget|python|axios/i;

export function isCountableVisit(userAgent: string | null, purpose: string | null) {
  if (!userAgent || NOT_A_VISITOR.test(userAgent)) return false;

  // Prefetches and prerenders are the browser guessing, not a person reading.
  return !/prefetch|prerender/i.test(purpose ?? "");
}

// The calendar day in the school's own time zone (YYYY-MM-DD).
export function visitDay(now: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone, year: "numeric" }).format(now);
}
