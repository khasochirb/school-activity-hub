"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  type FocusEvent,
  type MutableRefObject,
  type PointerEvent,
  useEffect,
  useRef,
} from "react";

const INTENT_DELAY_MS = 160;
const prefetchedHrefs = new Set<string>();

type ProtectedAppLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "prefetch"
> & {
  href: string;
  intentPrefetch?: boolean;
};

export function ProtectedAppLink({
  href,
  intentPrefetch = false,
  onFocus,
  onPointerEnter,
  onPointerLeave,
  ...props
}: ProtectedAppLinkProps) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearIntentTimer(timerRef), []);

  function prefetchForIntent() {
    if (!intentPrefetch) {
      return;
    }

    const destination = getInternalRoute(href);
    const currentRoute = `${window.location.pathname}${window.location.search}`;

    if (!destination || destination === currentRoute || prefetchedHrefs.has(destination)) {
      return;
    }

    prefetchedHrefs.add(destination);
    router.prefetch(href);
  }

  function handlePointerEnter(event: PointerEvent<HTMLAnchorElement>) {
    onPointerEnter?.(event);

    if (event.defaultPrevented || event.pointerType !== "mouse" || !intentPrefetch) {
      return;
    }

    clearIntentTimer(timerRef);
    timerRef.current = setTimeout(prefetchForIntent, INTENT_DELAY_MS);
  }

  function handlePointerLeave(event: PointerEvent<HTMLAnchorElement>) {
    onPointerLeave?.(event);
    clearIntentTimer(timerRef);
  }

  function handleFocus(event: FocusEvent<HTMLAnchorElement>) {
    onFocus?.(event);

    if (!event.defaultPrevented && event.currentTarget.matches(":focus-visible")) {
      prefetchForIntent();
    }
  }

  return (
    <Link
      {...props}
      href={href}
      onFocus={handleFocus}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      prefetch={false}
    />
  );
}

function clearIntentTimer(
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function getInternalRoute(href: string) {
  if (href.startsWith("#")) {
    return null;
  }

  try {
    const url = new URL(href, window.location.href);

    if (url.origin !== window.location.origin) {
      return null;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
