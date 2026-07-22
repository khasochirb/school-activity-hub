"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { PendingLinkIndicator } from "@/components/pending-link-indicator";
import { formatDate, formatDateTime } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import type { ReportStudentRow } from "@/lib/reports/activity-report";
import { MOTION_NORMAL_MS, motionDuration } from "@/lib/ui/motion";
import { EmptyState } from "../_components/page-ui";
import {
  loadStudentActivityDetails,
  type StudentReportRequest,
} from "./student-report-actions";
import type {
  StudentActivityDetails,
  StudentActivityEventDetail,
} from "./report-explorer-data";

type StudentSort = "clubs" | "participation" | "recent" | "registrations";
const PAGE_SIZE = 15;

export type StudentReportLabels = {
  attendanceRate: string;
  clubsJoined: string;
  close: string;
  detailsError: string;
  emptyDescription: string;
  emptyTitle: string;
  event: string;
  grade: string;
  history: string;
  homeroom: string;
  joinedClubs: string;
  lastParticipation: string;
  loading: string;
  next: string;
  noData: string;
  previous: string;
  participationByCategory: string;
  recentParticipation: string;
  recordedAttendances: string;
  registrationWithoutCheckin: string;
  registrations: string;
  school: string;
  search: string;
  searchPlaceholder: string;
  sort: string;
  studentActivityDetails: string;
  students: string;
  upcomingRegistrations: string;
  viewActivityDetails: string;
  viewEvent: string;
};

export function StudentReportRoster({
  categoryLabels,
  labels,
  locale,
  request,
  students,
}: {
  categoryLabels: Record<string, string>;
  labels: StudentReportLabels;
  locale: Locale;
  request: Omit<StudentReportRequest, "studentId">;
  students: ReportStudentRow[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<StudentSort>("participation");
  const [page, setPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [details, setDetails] = useState<StudentActivityDetails | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLElement | null>(null);
  const requestIdRef = useRef(0);
  const visibleStudents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return students
      .filter(
        (student) =>
          !normalized || student.name.toLocaleLowerCase(locale).includes(normalized),
      )
      .sort((left, right) => compareStudents(left, right, sort));
  }, [locale, query, sort, students]);
  const pageCount = Math.max(1, Math.ceil(visibleStudents.length / PAGE_SIZE));
  const effectivePage = Math.min(page, pageCount);
  const pagedStudents = visibleStudents.slice(
    (effectivePage - 1) * PAGE_SIZE,
    effectivePage * PAGE_SIZE,
  );

  const openStudent = useCallback(
    (studentId: string, trigger?: HTMLElement | null) => {
      if (trigger) {
        triggerRef.current = trigger;
      }
      setSelectedStudentId(studentId);
      setDetails(null);
      setLoadFailed(false);
      const requestId = ++requestIdRef.current;
      startTransition(async () => {
        const result = await loadStudentActivityDetails({
          ...request,
          studentId,
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setDetails(result.data);
        setLoadFailed(!result.ok);
      });
    },
    [request],
  );

  const closeDrawer = useCallback(() => {
    requestIdRef.current += 1;
    setSelectedStudentId(null);
    setDetails(null);
    setLoadFailed(false);
  }, []);
  const selectedIndex = selectedStudentId
    ? visibleStudents.findIndex((student) => student.id === selectedStudentId)
    : -1;

  return (
    <>
      <section className="section-card min-w-0 overflow-hidden">
        <div className="section-header">
          <h2 className="section-title">{labels.students}</h2>
          <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
              {labels.search}
              <input
                className="h-11 min-w-0 rounded-md border px-3 text-base font-normal outline-none"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={labels.searchPlaceholder}
                type="search"
                value={query}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold text-slate-800">
              {labels.sort}
              <select
                className="h-11 min-w-0 rounded-md border px-3 text-base font-normal outline-none"
                onChange={(event) => {
                  setSort(event.target.value as StudentSort);
                  setPage(1);
                }}
                value={sort}
              >
                <option value="participation">{labels.recordedAttendances}</option>
                <option value="registrations">{labels.registrations}</option>
                <option value="clubs">{labels.clubsJoined}</option>
                <option value="recent">{labels.lastParticipation}</option>
              </select>
            </label>
          </div>
        </div>

        {pagedStudents.length ? (
          <>
            <div className="grid gap-3 p-3 md:hidden">
              {pagedStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  labels={labels}
                  locale={locale}
                  onOpen={openStudent}
                  student={student}
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="data-table min-w-[58rem]">
                <thead><tr>
                  <th scope="col">{labels.students}</th>
                  <th scope="col">{labels.registrations}</th>
                  <th scope="col">{labels.recordedAttendances}</th>
                  <th scope="col">{labels.registrationWithoutCheckin}</th>
                  <th scope="col">{labels.clubsJoined}</th>
                  <th scope="col">{labels.upcomingRegistrations}</th>
                  <th scope="col">{labels.lastParticipation}</th>
                  <th scope="col"><span className="sr-only">{labels.viewActivityDetails}</span></th>
                </tr></thead>
                <tbody>
                  {pagedStudents.map((student) => (
                    <tr key={student.id}>
                      <th className="text-left" scope="row">
                        <span className="block break-words">{student.name}</span>
                        <span className="mt-1 block text-xs font-normal text-slate-600">
                          {[student.gradeLevel, student.homeroom].filter(Boolean).join(" · ")}
                        </span>
                      </th>
                      <td>{student.registrations}</td>
                      <td>{student.recordedAttendances}</td>
                      <td>{student.registrationsWithoutCheckin}</td>
                      <td>{student.clubsJoined}</td>
                      <td>{student.upcomingRegistrations}</td>
                      <td>{student.lastParticipationAt ? formatDate(student.lastParticipationAt, locale) : "-"}</td>
                      <td>
                        <button
                          className="btn btn-secondary min-h-10"
                          onClick={(event) => openStudent(student.id, event.currentTarget)}
                          type="button"
                        >
                          {labels.viewActivityDetails}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 ? (
              <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-3" aria-label={labels.students}>
                <span className="text-sm font-semibold text-slate-600">{effectivePage} / {pageCount}</span>
                <div className="flex gap-2">
                  <button className="btn btn-secondary min-h-10" disabled={effectivePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">{labels.previous}</button>
                  <button className="btn btn-secondary min-h-10" disabled={effectivePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">{labels.next}</button>
                </div>
              </nav>
            ) : null}
          </>
        ) : (
          <div className="p-4"><EmptyState description={labels.emptyDescription} title={labels.emptyTitle} /></div>
        )}
      </section>

      <StudentActivityDrawer
        details={details}
        categoryLabels={categoryLabels}
        hasNext={selectedIndex >= 0 && selectedIndex < visibleStudents.length - 1}
        hasPrevious={selectedIndex > 0}
        isLoading={isPending && !details}
        labels={labels}
        loadFailed={loadFailed}
        locale={locale}
        onClose={closeDrawer}
        onNext={() => openStudent(visibleStudents[selectedIndex + 1].id)}
        onPrevious={() => openStudent(visibleStudents[selectedIndex - 1].id)}
        open={Boolean(selectedStudentId)}
        returnFocusRef={triggerRef}
      />
    </>
  );
}

function StudentCard({
  labels,
  locale,
  onOpen,
  student,
}: {
  labels: StudentReportLabels;
  locale: Locale;
  onOpen: (studentId: string, trigger?: HTMLElement | null) => void;
  student: ReportStudentRow;
}) {
  return (
    <button
      className="interactive-card min-w-0 rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-3 text-left"
      onClick={(event) => onOpen(student.id, event.currentTarget)}
      type="button"
    >
      <span className="block break-words text-base font-bold text-slate-950">{student.name}</span>
      <span className="mt-1 block text-sm text-slate-600">{[student.gradeLevel, student.homeroom].filter(Boolean).join(" · ")}</span>
      <span className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <StudentMetric label={labels.registrations} value={student.registrations} />
        <StudentMetric label={labels.recordedAttendances} value={student.recordedAttendances} />
        <StudentMetric label={labels.clubsJoined} value={student.clubsJoined} />
        <StudentMetric label={labels.upcomingRegistrations} value={student.upcomingRegistrations} />
      </span>
      <span className="mt-3 block text-sm font-bold text-[var(--primary-strong)]">{labels.viewActivityDetails}</span>
      {student.lastParticipationAt ? (
        <span className="mt-1 block text-xs text-slate-600">{labels.lastParticipation}: {formatDate(student.lastParticipationAt, locale)}</span>
      ) : null}
    </button>
  );
}

function StudentMetric({ label, value }: { label: string; value: number }) {
  return <span className="rounded-md border border-[var(--border)] bg-[var(--card)] p-2"><span className="block text-xs text-slate-600">{label}</span><span className="mt-1 block font-bold text-slate-950">{value}</span></span>;
}

function StudentActivityDrawer({
  categoryLabels,
  details,
  hasNext,
  hasPrevious,
  isLoading,
  labels,
  loadFailed,
  locale,
  onClose,
  onNext,
  onPrevious,
  open,
  returnFocusRef,
}: {
  categoryLabels: Record<string, string>;
  details: StudentActivityDetails | null;
  hasNext: boolean;
  hasPrevious: boolean;
  isLoading: boolean;
  labels: StudentReportLabels;
  loadFailed: boolean;
  locale: Locale;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  open: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    const duration = motionDuration(MOTION_NORMAL_MS);
    if (duration) setClosing(true);
    window.setTimeout(() => {
      onClose();
      setClosing(false);
      returnFocusRef.current?.focus();
    }, duration);
  }, [onClose, returnFocusRef]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "Tab" && dialogRef.current) {
        trapFocus(event, dialogRef.current);
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, open]);

  if (!open) return null;

  return createPortal(
    <div className={`overlay-backdrop fixed inset-0 z-[85] flex justify-end bg-slate-950/60 ${closing ? "overlay-backdrop-closing" : ""}`} onMouseDown={(event) => event.target === event.currentTarget && close()} role="presentation">
      <aside aria-labelledby="student-report-drawer-title" aria-modal="true" className={`report-drawer-panel flex h-dvh w-[min(36rem,100vw)] min-w-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl ${closing ? "report-drawer-panel-closing" : ""}`} ref={dialogRef} role="dialog">
        <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-[var(--primary-strong)]">{labels.studentActivityDetails}</p>
            <h2 className="mt-1 break-words text-xl font-bold text-slate-950" id="student-report-drawer-title">{details?.student.name ?? labels.loading}</h2>
          </div>
          <button className="btn btn-secondary min-h-10 shrink-0" onClick={close} ref={closeRef} type="button">{labels.close}</button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] px-4 py-3">
          <button className="btn btn-secondary min-h-10" disabled={!hasPrevious || isLoading} onClick={onPrevious} type="button">{labels.previous}</button>
          <button className="btn btn-secondary min-h-10" disabled={!hasNext || isLoading} onClick={onNext} type="button">{labels.next}</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {isLoading ? <DrawerSkeleton label={labels.loading} /> : loadFailed || !details ? <EmptyState description={labels.detailsError} title={labels.noData} /> : <StudentDetails categoryLabels={categoryLabels} details={details} labels={labels} locale={locale} />}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function StudentDetails({ categoryLabels, details, labels, locale }: { categoryLabels: Record<string, string>; details: StudentActivityDetails; labels: StudentReportLabels; locale: Locale }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-soft)] p-3 text-sm text-slate-700">
        <p><strong>{labels.school}:</strong> {details.schoolName}</p>
        {details.student.gradeLevel ? <p><strong>{labels.grade}:</strong> {details.student.gradeLevel}</p> : null}
        {details.student.homeroom ? <p><strong>{labels.homeroom}:</strong> {details.student.homeroom}</p> : null}
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <DetailMetric label={labels.registrations} value={details.summary.totalRegistrations} />
        <DetailMetric label={labels.recordedAttendances} value={details.summary.recordedAttendances} />
        <DetailMetric label={labels.attendanceRate} value={details.summary.attendanceRate === null ? "-" : formatPercent(details.summary.attendanceRate, locale)} />
        <DetailMetric label={labels.clubsJoined} value={details.summary.clubsJoined} />
        <DetailMetric label={labels.upcomingRegistrations} value={details.summary.upcomingRegistrations} />
        <DetailMetric label={labels.lastParticipation} value={details.summary.lastParticipationAt ? formatDate(details.summary.lastParticipationAt, locale) : "-"} />
      </dl>
      <MiniVisuals categoryLabels={categoryLabels} details={details} labels={labels} locale={locale} />
      <ActivitySection items={details.upcoming} labels={labels} locale={locale} title={labels.upcomingRegistrations} />
      <ActivitySection items={details.recentParticipation} labels={labels} locale={locale} title={labels.recentParticipation} />
      <ActivitySection items={details.registrationsWithoutCheckin} labels={labels} locale={locale} title={labels.registrationWithoutCheckin} />
      <section className="rounded-lg border border-[var(--border)] p-3">
        <h3 className="font-bold text-slate-950">{labels.joinedClubs}</h3>
        {details.clubs.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{details.clubs.map((club) => <li className="break-words" key={club.id}>{club.name}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">{labels.noData}</p>}
      </section>
      <ActivitySection items={details.history} labels={labels} locale={locale} title={labels.history} />
    </div>
  );
}

function MiniVisuals({ categoryLabels, details, labels, locale }: { categoryLabels: Record<string, string>; details: StudentActivityDetails; labels: StudentReportLabels; locale: Locale }) {
  const weekMax = Math.max(...details.weeks.map((row) => row.count), 1);
  const categoryMax = Math.max(...details.categories.map((row) => row.count), 1);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="rounded-lg border border-[var(--border)] p-3">
        <h3 className="text-sm font-bold text-slate-950">{labels.recentParticipation}</h3>
        <div className="mt-3 flex h-24 items-end gap-1 overflow-x-auto" aria-label={labels.recentParticipation}>
          {details.weeks.map((week) => <span className="group flex min-w-5 flex-1 items-end" key={week.startsAt} title={`${formatDate(week.startsAt, locale)}: ${week.count}`}><span className="dashboard-chart-bar-y w-full rounded-t" style={{ "--chart-scale": week.count / weekMax } as React.CSSProperties} /></span>)}
        </div>
      </section>
      <section className="rounded-lg border border-[var(--border)] p-3">
        <h3 className="text-sm font-bold text-slate-950">{labels.participationByCategory}</h3>
        <div className="mt-3 space-y-2">{details.categories.length ? details.categories.map((row) => <div key={row.category}><div className="flex justify-between gap-2 text-xs"><span className="break-words text-slate-700">{categoryLabels[row.category] ?? row.category}</span><strong>{row.count}</strong></div><div className="dashboard-category-track mt-1"><span className="dashboard-chart-bar-x" style={{ "--chart-scale": row.count / categoryMax } as React.CSSProperties} /></div></div>) : <p className="text-sm text-slate-600">{labels.noData}</p>}</div>
      </section>
    </div>
  );
}

function ActivitySection({ items, labels, locale, title }: { items: StudentActivityEventDetail[]; labels: StudentReportLabels; locale: Locale; title: string }) {
  return <section className="rounded-lg border border-[var(--border)] p-3"><h3 className="font-bold text-slate-950">{title}</h3>{items.length ? <ul className="mt-2 divide-y divide-[var(--border)]">{items.map((item) => <li className="py-2" key={`${title}-${item.id}`}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-xs text-slate-600">{formatDateTime(item.startsAt, locale)}</p></div><Link className="shrink-0 text-sm font-bold text-[var(--primary-strong)]" href={`/events/${item.id}`} prefetch={false}>{labels.viewEvent}<PendingLinkIndicator /></Link></div></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">{labels.noData}</p>}</section>;
}

function DetailMetric({ label, value }: { label: string; value: number | string }) {
  return <div className="stat-card min-w-0"><dt className="stat-label break-words">{label}</dt><dd className="mt-2 break-words text-lg font-bold text-slate-950">{value}</dd></div>;
}

function DrawerSkeleton({ label }: { label: string }) {
  return <div aria-busy="true" aria-label={label} className="space-y-4"><div className="skeleton-block h-24 rounded-lg" /><div className="grid grid-cols-2 gap-2"><div className="skeleton-block h-20 rounded-lg" /><div className="skeleton-block h-20 rounded-lg" /></div><div className="skeleton-block h-48 rounded-lg" /></div>;
}

function trapFocus(event: KeyboardEvent, container: HTMLElement) {
  const focusable = Array.from(container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function compareStudents(left: ReportStudentRow, right: ReportStudentRow, sort: StudentSort) {
  if (sort === "registrations") return right.registrations - left.registrations;
  if (sort === "clubs") return right.clubsJoined - left.clubsJoined;
  if (sort === "recent") return (right.lastParticipationAt ?? "").localeCompare(left.lastParticipationAt ?? "");
  return right.recordedAttendances - left.recordedAttendances;
}

function formatPercent(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-CA", { maximumFractionDigits: 0, style: "percent" }).format(value);
}
