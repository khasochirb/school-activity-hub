import type { JoinAnswer } from "@/lib/clubs/join-form";

// A sent application: each question as it was asked, and the answer.
export function AnswerList({ answers, emptyLabel }: { answers: JoinAnswer[]; emptyLabel: string }) {
  const filled = (answers ?? []).filter((item) =>
    Array.isArray(item.answer) ? item.answer.length : item.answer,
  );

  if (!filled.length) return <p className="join-answers-empty">{emptyLabel}</p>;

  return (
    <dl className="join-answers">
      {filled.map((item) => (
        <div key={item.question_id}>
          <dt>{item.prompt}</dt>
          <dd>{Array.isArray(item.answer) ? item.answer.join(", ") : item.answer}</dd>
        </div>
      ))}
    </dl>
  );
}
