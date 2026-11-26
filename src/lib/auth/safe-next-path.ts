// Where to send a user after sign-in. Only same-site paths are accepted, so a
// crafted ?next= link cannot bounce a student to another website.
export function safeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return null;
  }

  if (value.startsWith("//") || value.includes("\\") || value.includes("://")) {
    return null;
  }

  return value;
}
