"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { useToast } from "@/components/toast-provider";
import {
  PORTFOLIO_BODY_MAX,
  PORTFOLIO_KINDS,
  PORTFOLIO_TITLE_MAX,
  PORTFOLIO_VISIBILITIES,
  type PortfolioKind,
  type PortfolioVisibility,
} from "@/lib/portfolio/portfolio";
import type { PortfolioOption } from "@/lib/portfolio/portfolio-data";
import { savePortfolioEntry } from "./actions";

export type EntryFormValues = {
  body: string;
  clubId: string | null;
  entryDate: string;
  eventId: string | null;
  id: string | null;
  isDraft: boolean;
  kind: PortfolioKind;
  title: string;
  visibility: PortfolioVisibility;
};

export type EntryFormLabels = {
  body: string;
  bodyPlaceholder: string;
  cancel: string;
  charactersLeft: string;
  club: string;
  date: string;
  draft: string;
  errors: Record<string, string>;
  event: string;
  kind: string;
  kinds: Record<PortfolioKind, string>;
  noClub: string;
  noEvent: string;
  photosAfterSave: string;
  prompts: string;
  saved: string;
  saving: string;
  submit: string;
  title: string;
  titlePlaceholder: string;
  visibility: string;
  visibilityHelp: Record<PortfolioVisibility, string>;
  visibilityOptions: Record<PortfolioVisibility, string>;
};

export function EntryForm({
  cancelHref,
  clubs,
  events,
  initial,
  labels,
}: {
  cancelHref: string;
  clubs: PortfolioOption[];
  events: PortfolioOption[];
  initial: EntryFormValues;
  labels: EntryFormLabels;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await savePortfolioEntry(values);

      if (!result.ok) {
        setError(labels.errors[result.code] ?? labels.errors.saveFailed);
        return;
      }

      notify({ message: labels.saved, variant: "success" });
      router.push(`/portfolio/entries/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form className="section-card section-card-padded portfolio-form" onSubmit={onSubmit}>
      <fieldset className="portfolio-field">
        <legend>{labels.kind}</legend>
        <div className="portfolio-choice-row">
          {PORTFOLIO_KINDS.map((kind) => (
            <label className="portfolio-choice" key={kind}>
              <input
                checked={values.kind === kind}
                name="kind"
                onChange={() => set("kind", kind)}
                type="radio"
                value={kind}
              />
              <span>{labels.kinds[kind]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="portfolio-field">
        <span>{labels.title}</span>
        <input
          className="h-11 rounded-md border px-3 text-base outline-none transition"
          maxLength={PORTFOLIO_TITLE_MAX}
          onChange={(event) => set("title", event.target.value)}
          placeholder={labels.titlePlaceholder}
          required
          value={values.title}
        />
      </label>

      <label className="portfolio-field">
        <span>{labels.body}</span>
        <small className="text-[var(--muted)]">{labels.prompts}</small>
        <textarea
          className="min-h-40 rounded-md border px-3 py-2 text-base outline-none transition"
          maxLength={PORTFOLIO_BODY_MAX}
          onChange={(event) => set("body", event.target.value)}
          placeholder={labels.bodyPlaceholder}
          value={values.body}
        />
        <small className="text-[var(--muted)]">
          {labels.charactersLeft.replace(
            "{count}",
            String(PORTFOLIO_BODY_MAX - values.body.length),
          )}
        </small>
      </label>

      <div className="portfolio-row3">
        <label className="portfolio-field">
          <span>{labels.date}</span>
          <input
            className="h-11 rounded-md border px-3 text-base outline-none transition"
            onChange={(event) => set("entryDate", event.target.value)}
            required
            type="date"
            value={values.entryDate}
          />
        </label>
        <label className="portfolio-field">
          <span>{labels.club}</span>
          <select
            className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
            onChange={(event) => set("clubId", event.target.value || null)}
            value={values.clubId ?? ""}
          >
            <option value="">{labels.noClub}</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.label}
              </option>
            ))}
          </select>
        </label>
        <label className="portfolio-field">
          <span>{labels.event}</span>
          <select
            className="h-11 cursor-pointer rounded-md border bg-white px-3 text-base outline-none transition"
            onChange={(event) => set("eventId", event.target.value || null)}
            value={values.eventId ?? ""}
          >
            <option value="">{labels.noEvent}</option>
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="portfolio-field">
        <legend>{labels.visibility}</legend>
        <div className="portfolio-visibility">
          {PORTFOLIO_VISIBILITIES.map((option) => (
            <label className="portfolio-visibility-option" key={option}>
              <input
                checked={values.visibility === option}
                name="visibility"
                onChange={() => set("visibility", option)}
                type="radio"
                value={option}
              />
              <span>
                <b>{labels.visibilityOptions[option]}</b>
                <small>{labels.visibilityHelp[option]}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          checked={values.isDraft}
          onChange={(event) => set("isDraft", event.target.checked)}
          type="checkbox"
        />
        {labels.draft}
      </label>

      {!values.id ? (
        <p className="text-sm text-[var(--muted)]">{labels.photosAfterSave}</p>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={pending} type="submit">
          {pending ? labels.saving : labels.submit}
        </button>
        <a className="btn btn-secondary" href={cancelHref}>
          {labels.cancel}
        </a>
      </div>
    </form>
  );
}
