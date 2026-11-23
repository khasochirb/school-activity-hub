"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { searchFounderCandidates, type FounderCandidate } from "./proposal-actions";

export type FounderPickerLabels = {
  count: string;
  noMatches: string;
  placeholder: string;
  remove: string;
  search: string;
};

// Type a name or class, pick classmates like tagging an account. The picked
// students go to the form as founder_profile_ids.
export function FounderPicker({
  labels,
  max,
  min,
}: {
  labels: FounderPickerLabels;
  max: number;
  min: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FounderCandidate[]>([]);
  const [picked, setPicked] = useState<FounderCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [, startSearch] = useTransition();
  const latest = useRef(0);
  const listId = useId();

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) return;

    const ticket = ++latest.current;
    const timer = window.setTimeout(() => {
      startSearch(async () => {
        const found = await searchFounderCandidates(term);

        if (ticket === latest.current) {
          setResults(found);
          setSearched(true);
        }
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  const active = query.trim().length >= 2;
  const pickedIds = new Set(picked.map((person) => person.profileId));
  const visible = active ? results.filter((person) => !pickedIds.has(person.profileId)) : [];
  const full = picked.length >= max;

  function add(person: FounderCandidate) {
    if (full || pickedIds.has(person.profileId)) return;
    setPicked((current) => [...current, person]);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="founder-picker">
      {picked.length ? (
        <ul className="founder-chips">
          {picked.map((person) => (
            <li className="founder-chip" key={person.profileId}>
              <input name="founder_profile_ids" type="hidden" value={person.profileId} />
              <span>
                {person.displayName}
                {person.homeroom ? <small> · {person.homeroom}</small> : null}
              </span>
              <button
                aria-label={`${labels.remove}: ${person.displayName}`}
                onClick={() => setPicked((current) => current.filter((p) => p.profileId !== person.profileId))}
                type="button"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
        {labels.search}
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          autoComplete="off"
          className="h-11 rounded-md border px-3 text-base font-normal outline-none transition"
          disabled={full}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (visible[0]) add(visible[0]);
            }
          }}
          placeholder={labels.placeholder}
          value={query}
        />
      </label>
      {visible.length ? (
        <ul className="founder-results" id={listId} role="listbox">
          {visible.map((person) => (
            <li key={person.profileId}>
              <button onClick={() => add(person)} role="option" aria-selected={false} type="button">
                <b>{person.displayName}</b>
                {person.homeroom ? <span>{person.homeroom}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : searched && active ? (
        <p className="founder-hint">{labels.noMatches}</p>
      ) : null}
      <p className="founder-hint" data-ok={picked.length >= min ? "" : undefined}>
        {labels.count.replace("{count}", String(picked.length)).replace("{min}", String(min))}
      </p>
    </div>
  );
}
