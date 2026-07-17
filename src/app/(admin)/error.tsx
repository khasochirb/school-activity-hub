"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getDictionary, translate } from "@/lib/i18n/dictionary";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/locales";

export default function AdminError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getBrowserLocale,
    getServerLocale,
  );
  const dictionary = getDictionary(locale);
  const t = (key: string) => translate(dictionary, key);

  return (
    <section
      aria-labelledby="protected-route-error-title"
      className="section-card section-card-padded mx-auto max-w-2xl text-center"
      role="alert"
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">
        {t("feedback.error")}
      </p>
      <h1
        className="mt-3 text-2xl font-black text-slate-950"
        id="protected-route-error-title"
      >
        {t("routeError.title")}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
        {t("routeError.description")}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          className="btn btn-primary min-h-11"
          onClick={() => unstable_retry()}
          type="button"
        >
          {t("routeError.retry")}
        </button>
        <Link
          className="btn btn-secondary min-h-11"
          href="/dashboard"
          prefetch={false}
        >
          {t("routeError.backToDashboard")}
        </Link>
      </div>
    </section>
  );
}

function subscribeToLocale() {
  return () => undefined;
}

function getBrowserLocale(): Locale {
  return normalizeLocale(document.documentElement.lang);
}

function getServerLocale(): Locale {
  return DEFAULT_LOCALE;
}
