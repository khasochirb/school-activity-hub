"use client";

import { useEffect, useState } from "react";

// Shows the time at the school, so students and staff see the same clock
// whatever their device is set to.
export function TopBarClock({
  locale,
  timeZone,
}: {
  locale: string;
  timeZone: string | null;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);

    return () => window.clearInterval(id);
  }, []);

  if (!now || !timeZone) return <span className="topbar-clock" />;

  let label: string;

  try {
    const time = new Intl.DateTimeFormat(locale === "mn" ? "mn-MN" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }).format(now);
    const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? "";

    label = `${time} ${city}`;
  } catch {
    return <span className="topbar-clock" />;
  }

  return (
    <span className="topbar-clock" suppressHydrationWarning>
      {label}
    </span>
  );
}
