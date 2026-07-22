export type EventCalendarActionLabels = {
  addToCalendar: string;
  downloadCalendarFile: string;
  googleCalendar: string;
  registeredSuggestion: string;
};

export function EventCalendarActions({
  calendarDownloadUrl,
  googleCalendarUrl,
  labels,
  showRegisteredSuggestion = false,
}: {
  calendarDownloadUrl: string;
  googleCalendarUrl: string;
  labels: EventCalendarActionLabels;
  showRegisteredSuggestion?: boolean;
}) {
  return (
    <details className="animated-native-details group min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-2">
      <summary className="btn btn-secondary min-h-10 w-full cursor-pointer list-none justify-between px-3 sm:w-auto">
        <span>{labels.addToCalendar}</span>
        <span aria-hidden="true" className="text-base leading-none">
          +
        </span>
      </summary>
      <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
        <a
          className="btn btn-secondary min-h-10 min-w-0 whitespace-normal text-center"
          download
          href={calendarDownloadUrl}
        >
          {labels.downloadCalendarFile}
        </a>
        <a
          className="btn btn-secondary min-h-10 min-w-0 whitespace-normal text-center"
          href={googleCalendarUrl}
          rel="noreferrer noopener"
          target="_blank"
        >
          {labels.googleCalendar}
          <span aria-hidden="true"> ↗</span>
        </a>
      </div>
      {showRegisteredSuggestion ? (
        <p className="mt-2 text-sm text-slate-600">
          {labels.registeredSuggestion}
        </p>
      ) : null}
    </details>
  );
}
