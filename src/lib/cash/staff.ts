import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Names the shared computer may pick from, per location it can close.
export async function loadStaff(supabase: Client, locationIds: string[]) {
  const results = await Promise.all(
    locationIds.map((id) => supabase.rpc("cash_staff", { p_location: id })),
  );
  if (results.some((result) => result.error))
    throw new Error("STAFF_UNAVAILABLE");
  return Object.fromEntries(
    locationIds.map((id, index) => [id, results[index].data ?? []]),
  );
}
