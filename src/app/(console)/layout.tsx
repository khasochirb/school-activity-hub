import type { ReactNode } from "react";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { ConsoleFrame } from "./console-frame";

// Platform admins' console: its own dark shell with a sidebar, outside the
// school app's top bar. Every page in this group is platform-admin only.
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const admin = await requirePlatformAdmin();

  return (
    <ConsoleFrame email={admin.email} name={admin.full_name}>
      {children}
    </ConsoleFrame>
  );
}
