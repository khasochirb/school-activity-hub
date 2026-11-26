import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/i18n/date-format";
import {
  PORTFOLIO_ENTRY_SELECT,
  PORTFOLIO_MAX_PHOTOS,
  isUuidValue,
  type PortfolioEntry,
} from "@/lib/portfolio/portfolio";
import {
  getOwnRoster,
  getPortfolioI18n,
  getPortfolioViewer,
  getRosterStudent,
  getStudentLinks,
} from "@/lib/portfolio/portfolio-data";
import { createClient } from "@/lib/supabase/server";
import { HeaderActionLink, StatusBadge } from "../../../_components/page-ui";
import { EntryForm } from "../../entry-form";
import { buildEntryFormLabels, portfolioErrorLabels } from "../../entry-form-labels";
import {
  EntryOwnerTools,
  FeedbackForm,
  PhotoManager,
  type OwnerToolsLabels,
} from "../../entry-owner-tools";

type Feedback = {
  author_profile_id: string | null;
  body: string;
  created_at: string;
  id: string;
};

export default async function PortfolioEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { entryId } = await params;
  const { edit } = await searchParams;
  const { locale, t, tf } = await getPortfolioI18n();
  const viewer = await getPortfolioViewer();

  if (!viewer) redirect("/login");
  if (!isUuidValue(entryId)) notFound();

  const supabase = await createClient();
  const [{ data: entry }, { data: owns }] = await Promise.all([
    supabase
      .from("portfolio_entries")
      .select(PORTFOLIO_ENTRY_SELECT)
      .eq("id", entryId)
      .maybeSingle<PortfolioEntry>(),
    supabase.rpc("current_user_owns_portfolio_entry", {
      target_entry_id: entryId,
    }),
  ]);

  if (!entry) notFound();

  const isOwner = owns === true;
  const isStaff = viewer.role === "teacher" || viewer.role === "school_admin";
  const canReadNotes = isOwner || isStaff;
  const [student, clubResult, eventResult, feedbackResult] = await Promise.all([
    isOwner
      ? getOwnRoster(viewer)
      : getRosterStudent(viewer.schoolId, entry.student_roster_id),
    entry.club_id
      ? supabase.from("clubs").select("id, name").eq("id", entry.club_id).maybeSingle<{ id: string; name: string }>()
      : Promise.resolve({ data: null }),
    entry.event_id
      ? supabase.from("events").select("id, title").eq("id", entry.event_id).maybeSingle<{ id: string; title: string }>()
      : Promise.resolve({ data: null }),
    canReadNotes
      ? supabase
          .from("portfolio_feedback")
          .select("id, body, created_at, author_profile_id")
          .eq("entry_id", entry.id)
          .order("created_at")
          .returns<Feedback[]>()
      : Promise.resolve({ data: [] as Feedback[] }),
  ]);
  const feedback = feedbackResult.data ?? [];
  const authorIds = [...new Set(feedback.map((f) => f.author_profile_id).filter(Boolean))] as string[];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds).returns<{ full_name: string; id: string }[]>()
    : { data: [] as { full_name: string; id: string }[] };
  const authorName = new Map((authors ?? []).map((a) => [a.id, a.full_name]));
  const photos = entry.media_paths.map((path, index) => ({
    alt: tf("portfolio.entry.photoAlt", { number: index + 1, title: entry.title }),
    path,
    src: `/portfolio/media/${entry.id}/${index}`,
  }));
  const backHref = isOwner
    ? "/portfolio"
    : `/portfolio/students/${entry.student_roster_id}`;
  const editing = isOwner && edit === "1";
  const ownerLabels: OwnerToolsLabels = {
    addPhotos: t("portfolio.entry.addPhotos"),
    cancel: t("portfolio.form.cancel"),
    confirm: t("portfolio.entry.delete"),
    delete: t("portfolio.entry.delete"),
    deleteConfirm: t("portfolio.entry.deleteConfirm"),
    deleting: t("common.saving"),
    errors: portfolioErrorLabels(t),
    feature: t("portfolio.entry.feature"),
    featured: t("portfolio.toasts.featured"),
    photoAdded: t("portfolio.toasts.photoAdded"),
    photoLimit: tf("portfolio.entry.photoLimit", { count: PORTFOLIO_MAX_PHOTOS }),
    photoRemoved: t("portfolio.toasts.photoRemoved"),
    removePhoto: t("portfolio.entry.removePhoto"),
    unfeature: t("portfolio.entry.unfeature"),
    unfeatured: t("portfolio.toasts.unfeatured"),
    uploading: t("portfolio.entry.uploading"),
  };

  if (editing) {
    const links = await getStudentLinks(viewer.schoolId, entry.student_roster_id);

    return (
      <div className="page-stack">
        <div className="flex flex-wrap items-center gap-2">
          <HeaderActionLink href={`/portfolio/entries/${entry.id}`} variant="secondary">
            {t("portfolio.form.cancel")}
          </HeaderActionLink>
          <span className="page-eyebrow">{t("portfolio.form.editTitle")}</span>
        </div>
        <EntryForm
          cancelHref={`/portfolio/entries/${entry.id}`}
          clubs={links.clubs}
          events={links.events}
          initial={{
            body: entry.body ?? "",
            clubId: entry.club_id,
            entryDate: entry.entry_date,
            eventId: entry.event_id,
            id: entry.id,
            isDraft: entry.is_draft,
            kind: entry.kind,
            title: entry.title,
            visibility: entry.visibility,
          }}
          labels={buildEntryFormLabels(t, "edit")}
        />
        <section className="section-card section-card-padded">
          <h2 className="section-title mb-3">{t("portfolio.entry.photos")}</h2>
          <PhotoManager entryId={entry.id} labels={ownerLabels} photos={photos} />
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-center gap-2">
        <HeaderActionLink href={backHref} variant="secondary">
          {isOwner ? t("portfolio.entry.back") : student?.displayName ?? t("portfolio.title")}
        </HeaderActionLink>
        <span className="page-eyebrow">{t(`portfolio.kinds.${entry.kind}`)}</span>
      </div>

      <article className="portfolio-entry">
        <div className="min-w-0 space-y-4">
          {photos.length ? (
            <div className="portfolio-gallery">
              {photos.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={photo.alt} key={photo.path} src={photo.src} />
              ))}
            </div>
          ) : null}
          <h1 className="event-hero-title">{entry.title}</h1>
          <div className="flex flex-wrap gap-2">
            <StatusBadge>{formatDate(`${entry.entry_date}T12:00:00`, locale)}</StatusBadge>
            {entry.is_featured ? <StatusBadge variant="warning">{t("portfolio.badges.featured")}</StatusBadge> : null}
            {isOwner ? (
              entry.is_draft ? (
                <StatusBadge>{t("portfolio.badges.draft")}</StatusBadge>
              ) : (
                <StatusBadge variant="info">{t(`portfolio.visibility.${entry.visibility}`)}</StatusBadge>
              )
            ) : null}
            {clubResult.data ? (
              <Link className="badge" href={`/clubs/${clubResult.data.id}`}>
                {t("portfolio.entry.linkedClub")}: {clubResult.data.name}
              </Link>
            ) : null}
            {eventResult.data ? (
              <Link className="badge" href={`/events/${eventResult.data.id}`}>
                {t("portfolio.entry.linkedEvent")}: {eventResult.data.title}
              </Link>
            ) : null}
          </div>
          <p className="whitespace-pre-line text-base leading-7 text-[var(--foreground)]">
            {entry.body || t("portfolio.entry.noBody")}
          </p>
          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              <Link className="btn btn-primary" href={`/portfolio/entries/${entry.id}?edit=1`}>
                {t("portfolio.entry.edit")}
                {photos.length < PORTFOLIO_MAX_PHOTOS ? ` · ${t("portfolio.entry.addPhotos")}` : ""}
              </Link>
              <EntryOwnerTools
                entryId={entry.id}
                isDraft={entry.is_draft}
                isFeatured={entry.is_featured}
                labels={ownerLabels}
              />
            </div>
          ) : null}
        </div>

        {canReadNotes ? (
          <aside className="section-card section-card-padded space-y-3 self-start">
            <h2 className="section-title">{t("portfolio.feedback.title")}</h2>
            {feedback.length ? (
              <ul className="space-y-3">
                {feedback.map((note) => (
                  <li className="portfolio-note" key={note.id}>
                    <p className="whitespace-pre-line text-sm leading-6">{note.body}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {(note.author_profile_id && authorName.get(note.author_profile_id)) || t("roles.teacher")}
                      {" · "}
                      {formatDateTime(note.created_at, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">{t("portfolio.feedback.empty")}</p>
            )}
            {isStaff && !entry.is_draft && entry.visibility !== "private" ? (
              <FeedbackForm
                entryId={entry.id}
                labels={{
                  errors: portfolioErrorLabels(t),
                  noteAdded: t("portfolio.toasts.noteAdded"),
                  placeholder: t("portfolio.feedback.placeholder"),
                  send: t("portfolio.feedback.send"),
                  sending: t("portfolio.feedback.sending"),
                  title: t("portfolio.feedback.add"),
                }}
              />
            ) : null}
            <p className="text-xs text-[var(--muted)]">{t("portfolio.feedback.privacy")}</p>
          </aside>
        ) : null}
      </article>
    </div>
  );
}
