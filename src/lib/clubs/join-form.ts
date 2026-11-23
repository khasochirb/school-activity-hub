// Club application forms: the rules shared by the form builder, the
// application page and the server actions. No imports, so the tests can run
// it directly.

export const QUESTION_KINDS = ["short", "long", "choice", "checkbox"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const JOIN_MODES = ["open", "apply"] as const;
export type JoinMode = (typeof JOIN_MODES)[number];

export const MAX_QUESTIONS = 15;
export const MAX_OPTIONS = 12;
export const MAX_PROMPT = 300;
export const MAX_OPTION = 120;
export const MAX_ANSWER = { long: 2000, short: 300 } as const;

export type JoinQuestion = {
  id?: string;
  kind: QuestionKind;
  options: string[];
  prompt: string;
  required: boolean;
};

export type JoinAnswer = {
  answer: string | string[];
  kind: QuestionKind;
  prompt: string;
  question_id: string;
};

export function isChoiceKind(kind: QuestionKind) {
  return kind === "choice" || kind === "checkbox";
}

export function parseJoinMode(value: unknown): JoinMode | null {
  return JOIN_MODES.find((mode) => mode === value) ?? null;
}

// Validates the builder's JSON. Returns the cleaned questions, or an error key
// under clubs.join.errors.
export function parseQuestions(raw: string):
  | { error: string; questions?: undefined }
  | { error?: undefined; questions: JoinQuestion[] } {
  let value: unknown;

  try {
    value = JSON.parse(raw || "[]");
  } catch {
    return { error: "invalidForm" };
  }

  if (!Array.isArray(value)) return { error: "invalidForm" };
  if (value.length > MAX_QUESTIONS) return { error: "tooManyQuestions" };

  const questions: JoinQuestion[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return { error: "invalidForm" };

    const source = item as Record<string, unknown>;
    const kind = QUESTION_KINDS.find((option) => option === source.kind);
    const prompt = typeof source.prompt === "string" ? source.prompt.trim() : "";

    if (!kind) return { error: "invalidForm" };
    if (!prompt) return { error: "emptyQuestion" };
    if (prompt.length > MAX_PROMPT) return { error: "questionTooLong" };

    const options = isChoiceKind(kind)
      ? Array.from(
          new Set(
            (Array.isArray(source.options) ? source.options : [])
              .map((option) => (typeof option === "string" ? option.trim() : ""))
              .filter(Boolean),
          ),
        )
      : [];

    if (isChoiceKind(kind) && options.length < 2) return { error: "needTwoOptions" };
    if (options.length > MAX_OPTIONS) return { error: "tooManyOptions" };
    if (options.some((option) => option.length > MAX_OPTION)) return { error: "optionTooLong" };

    questions.push({
      id: typeof source.id === "string" ? source.id : undefined,
      kind,
      options,
      prompt,
      required: source.required !== false,
    });
  }

  return { questions };
}

// Checks a student's answers against the club's questions. `read` returns
// every value sent for a field name (one for text, several for checkboxes).
export function collectAnswers(
  questions: Array<JoinQuestion & { id: string }>,
  read: (name: string) => string[],
):
  | { answers?: undefined; error: string; questionId: string }
  | { answers: JoinAnswer[]; error?: undefined; questionId?: undefined } {
  const answers: JoinAnswer[] = [];

  for (const question of questions) {
    const values = read(`q_${question.id}`)
      .map((value) => value.trim())
      .filter(Boolean);
    let answer: string | string[];

    if (question.kind === "checkbox") {
      answer = values.filter((value) => question.options.includes(value));
    } else if (question.kind === "choice") {
      answer = question.options.includes(values[0] ?? "") ? values[0] : "";
    } else {
      answer = values[0] ?? "";

      if (answer.length > MAX_ANSWER[question.kind]) {
        return { error: "answerTooLong", questionId: question.id };
      }
    }

    const empty = Array.isArray(answer) ? !answer.length : !answer;

    if (question.required && empty) {
      return { error: "answerRequired", questionId: question.id };
    }

    answers.push({ answer, kind: question.kind, prompt: question.prompt, question_id: question.id });
  }

  return { answers };
}
