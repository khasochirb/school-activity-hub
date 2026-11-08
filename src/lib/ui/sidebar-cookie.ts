// Cookie that keeps the desktop sidebar collapsed or expanded between visits.
// In a plain module: a constant imported from a "use client" file reaches a
// server component as a client reference, not as the string.
export const SIDEBAR_COOKIE = "sah-sidebar";
