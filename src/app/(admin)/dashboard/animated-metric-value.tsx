"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/locales";
import { motionDuration } from "@/lib/ui/motion";

const COUNT_DURATION_MS = 420;

export function AnimatedMetricValue({
  locale,
  value,
}: {
  locale: Locale;
  value: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const formatter = new Intl.NumberFormat(locale === "mn" ? "mn-MN" : "en-CA");

  useEffect(() => {
    const duration = motionDuration(COUNT_DURATION_MS);

    if (!duration || value <= 0) {
      return;
    }

    let frame = 0;
    let startedAt = 0;

    function update(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * easedProgress));

      if (progress < 1) {
        frame = requestAnimationFrame(update);
      }
    }

    frame = requestAnimationFrame((now) => {
      startedAt = now;
      setDisplayValue(0);
      frame = requestAnimationFrame(update);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <>
      <span className="sr-only">{formatter.format(value)}</span>
      <span aria-hidden="true">{formatter.format(displayValue)}</span>
    </>
  );
}
