import "server-only";
import { headers } from "next/headers";

export async function getServerBaseUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredSiteUrl) {
    return normalizeBaseUrl(configuredSiteUrl);
  }

  const headersList = await headers();
  const forwardedHost = firstHeaderValue(headersList.get("x-forwarded-host"));
  const host = forwardedHost ?? firstHeaderValue(headersList.get("host"));

  if (!host) {
    return "";
  }

  const forwardedProtocol = firstHeaderValue(
    headersList.get("x-forwarded-proto"),
  );
  const protocol =
    forwardedProtocol ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

export function absoluteServerUrl(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return baseUrl ? `${normalizeBaseUrl(baseUrl)}${normalizedPath}` : normalizedPath;
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}
