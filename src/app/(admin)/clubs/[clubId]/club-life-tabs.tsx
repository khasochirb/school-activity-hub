import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { ClubLife } from "@/lib/clubs/club-life";
import { formatDate, formatDateTime } from "@/lib/i18n/date-format";
import type { Locale } from "@/lib/i18n/locales";
import { deleteClubMeeting, deleteClubPost } from "../club-life-actions";
import { ClubAttendanceForm, ClubPostForm } from "./club-life-forms";

type T = (key: string) => string;
type TF = (key: string, values: Record<string, string | number>) => string;

// Posts: managers write, members read.
export function ClubPostsTab({
  canManage,
  clubId,
  life,
  locale,
  t,
}: {
  canManage: boolean;
  clubId: string;
  life: ClubLife;
  locale: Locale;
  t: T;
}) {
  return (
    <div className="detail-tab-stack">
      {canManage ? (
        <ClubPostForm
          clubId={clubId}
          labels={{ placeholder: t("clubs.life.postPlaceholder"), post: t("clubs.life.post"), posting: t("clubs.life.posting") }}
        />
      ) : null}
      {life.posts.length ? (
        <ul className="club-posts">
          {life.posts.map((post) => (
            <li className="cl-card" key={post.id}>
              <header>
                <small>
                  {[post.author, formatDateTime(post.createdAt, locale)].filter(Boolean).join(" · ")}
                </small>
                {canManage ? (
                  <form action={deleteClubPost}>
                    <input name="post_id" type="hidden" value={post.id} />
                    <ConfirmSubmitButton
                      cancelLabel={t("common.cancel")}
                      className="join-link-btn"
                      confirmDescription={t("feedback.cannotBeUndone")}
                      confirmLabel={t("clubs.life.delete")}
                      confirmTitle={t("clubs.life.deletePostTitle")}
                      pendingLabel={t("common.saving")}
                    >
                      {t("clubs.life.delete")}
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
              </header>
              <p>{post.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cl-empty">{t("clubs.life.noPosts")}</p>
      )}
    </div>
  );
}

// Members: names, classes and roles, for the people who run the club.
export function ClubMembersTab({ life, locale, t, tf }: { life: ClubLife; locale: Locale; t: T; tf: TF }) {
  const rate = new Map<string, { present: number; total: number }>();

  life.meetings.forEach((meeting) => {
    Object.entries(meeting.statuses).forEach(([rosterId, status]) => {
      const entry = rate.get(rosterId) ?? { present: 0, total: 0 };
      entry.total += 1;
      if (status === "present") entry.present += 1;
      rate.set(rosterId, entry);
    });
  });

  return (
    <div className="detail-tab-stack">
      <p className="text-sm text-[var(--muted)]">{tf("clubs.life.memberCount", { count: life.members.length })}</p>
      <ul className="club-members">
        {life.members.map((member) => {
          const record = rate.get(member.rosterId);

          return (
            <li key={member.rosterId}>
              <span className="min-w-0">
                <b>{member.name}</b>
                <small>
                  {[member.homeroom, tf("clubs.life.joined", { date: formatDate(member.joinedAt, locale) })]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>
              <span className="club-members-end">
                {record ? (
                  <span className="text-sm text-[var(--muted)]">
                    {tf("clubs.life.attendanceRate", { present: record.present, total: record.total })}
                  </span>
                ) : null}
                {member.role === "leader" ? (
                  <span className="cl-tag" data-tone="ok">
                    {t("clubs.memberRoles.leader")}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Attendance: take it for a meeting, and see past meetings.
export function ClubAttendanceTab({
  clubId,
  life,
  locale,
  t,
  tf,
  today,
}: {
  clubId: string;
  life: ClubLife;
  locale: Locale;
  t: T;
  tf: TF;
  today: string;
}) {
  if (!life.members.length) return <p className="cl-empty">{t("clubs.life.errors.noMembers")}</p>;

  return (
    <div className="detail-tab-stack">
      <ClubAttendanceForm
        clubId={clubId}
        labels={{
          allPresent: t("clubs.life.allPresent"),
          date: t("clubs.life.meetingDate"),
          note: t("clubs.life.note"),
          notePlaceholder: t("clubs.life.notePlaceholder"),
          save: t("clubs.life.saveAttendance"),
          saving: t("common.saving"),
          statuses: {
            absent: t("clubs.life.status.absent"),
            excused: t("clubs.life.status.excused"),
            present: t("clubs.life.status.present"),
          },
        }}
        meetings={life.meetings}
        members={life.members}
        today={today}
      />
      {life.meetings.length ? (
        <section className="club-meetings">
          <h3>{t("clubs.life.pastMeetings")}</h3>
          <ul>
            {life.meetings.map((meeting) => {
              const values = Object.values(meeting.statuses);

              return (
                <li key={meeting.id}>
                  <span className="min-w-0">
                    <b>{formatDate(`${meeting.date}T12:00:00`, locale)}</b>
                    <small>
                      {tf("clubs.life.meetingSummary", {
                        absent: values.filter((value) => value === "absent").length,
                        excused: values.filter((value) => value === "excused").length,
                        present: values.filter((value) => value === "present").length,
                      })}
                      {meeting.note ? ` · ${meeting.note}` : ""}
                    </small>
                  </span>
                  <form action={deleteClubMeeting}>
                    <input name="meeting_id" type="hidden" value={meeting.id} />
                    <ConfirmSubmitButton
                      cancelLabel={t("common.cancel")}
                      className="join-link-btn"
                      confirmDescription={t("feedback.cannotBeUndone")}
                      confirmLabel={t("clubs.life.delete")}
                      confirmTitle={t("clubs.life.deleteMeetingTitle")}
                      pendingLabel={t("common.saving")}
                    >
                      {t("clubs.life.delete")}
                    </ConfirmSubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-[var(--muted)]">{t("clubs.life.editHint")}</p>
        </section>
      ) : null}
    </div>
  );
}
