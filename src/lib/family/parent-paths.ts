// Where a parent account may go. Everything else in the app is for school
// staff and students, so the request proxy sends parents to /family instead.
// No imports, so the tests can run it directly.

const PARENT_PATH_PREFIXES = ["/family", "/join", "/login", "/reset-password", "/update-password", "/s/"];

export function isParentAllowedPath(pathname: string) {
  if (pathname === "/") return true;

  return PARENT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`),
  );
}

// Parent accounts carry this in their auth app_metadata (only the service
// role can set it), so the proxy can tell without a database lookup.
export const PARENT_ACCOUNT_TYPE = "parent";
