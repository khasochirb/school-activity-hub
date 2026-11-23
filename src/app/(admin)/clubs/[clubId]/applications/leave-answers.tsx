// A leave request as the reviewers (and the student) read it.
export function LeaveAnswers({
  feedback,
  labels,
  reason,
  reasonLabel,
}: {
  feedback: string | null;
  labels: { feedback: string; reason: string };
  reason: string;
  reasonLabel: string;
}) {
  return (
    <dl className="join-answers">
      <div>
        <dt>{labels.reason}</dt>
        <dd>
          <span className="cl-tag" data-tone="warn">
            {reasonLabel}
          </span>{" "}
          {reason}
        </dd>
      </div>
      {feedback ? (
        <div>
          <dt>{labels.feedback}</dt>
          <dd>{feedback}</dd>
        </div>
      ) : null}
    </dl>
  );
}
