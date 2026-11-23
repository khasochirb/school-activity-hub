// Leaving a club: the questions a student answers and how they are checked.
// No imports, so the tests can run it directly.

export const LEAVE_REASONS = ["busy", "schedule", "interest", "expectations", "people", "other"] as const;
export type LeaveReason = (typeof LEAVE_REASONS)[number];

export const MAX_LEAVE_REASON = 1000;
export const MAX_LEAVE_FEEDBACK = 2000;

export type LeaveRequestInput = {
  feedback: string | null;
  reason: string;
  reasonKind: LeaveReason;
};

// Returns the cleaned answers, or an error key under clubs.leave.errors.
export function parseLeaveRequest(values: {
  feedback: unknown;
  reason: unknown;
  reasonKind: unknown;
}): { error: string; input?: undefined } | { error?: undefined; input: LeaveRequestInput } {
  const reasonKind = LEAVE_REASONS.find((kind) => kind === values.reasonKind);
  const reason = typeof values.reason === "string" ? values.reason.trim() : "";
  const feedback = typeof values.feedback === "string" ? values.feedback.trim() : "";

  if (!reasonKind) return { error: "chooseReason" };
  if (!reason) return { error: "explainReason" };
  if (reason.length > MAX_LEAVE_REASON) return { error: "reasonTooLong" };
  if (feedback.length > MAX_LEAVE_FEEDBACK) return { error: "feedbackTooLong" };

  return { input: { feedback: feedback || null, reason, reasonKind } };
}
