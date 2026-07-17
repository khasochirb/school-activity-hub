import "server-only";

import { cache } from "react";
import { timeServer } from "@/lib/server-timing";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () =>
  timeServer("auth.current-user", async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  }),
);
