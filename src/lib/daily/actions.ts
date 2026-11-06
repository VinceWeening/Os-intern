"use server";
import { revalidatePath } from "next/cache";
import {
  requireAdmin,
  requireStaff,
  requirePermission,
} from "@/lib/auth/session";
import { validDaily, type DailyInput } from "./model";
function failure(error: { code?: string }, event: string) {
  console.error(JSON.stringify({ event, code: error.code }));
  return {
    error:
      error.code === "PT409"
        ? "Dit is op een ander apparaat gewijzigd. Je invoer blijft staan; vernieuw eerst de opgeslagen gegevens."
        : error.code === "42501"
          ? "Je hebt geen toegang tot deze handeling."
          : "Opslaan is niet bevestigd. Controleer je verbinding voordat je opnieuw probeert.",
  };
}
export async function sendFeedback(input: {
  id: string;
  locationId: string | null;
  kind: string;
  title: string;
  description: string;
}) {
  const { supabase } = await requireStaff();
  if (
    !input ||
    !["idea", "bug"].includes(input.kind) ||
    typeof input.title !== "string" ||
    input.title.trim().length < 3 ||
    input.title.trim().length > 120 ||
    typeof input.description !== "string" ||
    input.description.trim().length < 3 ||
    input.description.trim().length > 4000
  )
    return { error: "Vul een titel en omschrijving in." };
  const { error } = await supabase
    .rpc("send_feedback", {
      p_id: input.id,
      p_location: input.locationId,
      p_kind: input.kind,
      p_title: input.title,
      p_description: input.description,
    })
    .retry(false);
  if (error) return failure(error, "feedback_send_failed");
  revalidatePath("/beveiliging");
  return {
    success: "Je melding is opgeslagen. Je ziet de voortgang hieronder.",
  };
}
export async function updateFeedback(
  id: string,
  version: number,
  status: string,
) {
  const { supabase } = await requireAdmin();
  if (!["new", "planned", "done"].includes(status))
    return { error: "Ongeldige status." };
  const { error } = await supabase
    .rpc("update_feedback", { p_id: id, p_version: version, p_status: status })
    .retry(false);
  if (error) return failure(error, "feedback_status_failed");
  revalidatePath("/beveiliging");
  return { success: "Status bijgewerkt." };
}
export async function saveDaily(input: {
  locationId: string;
  date: string;
  version: number;
  values: DailyInput;
}) {
  const { supabase } = await requirePermission("day.edit");
  if (
    !validDaily(input?.values) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !Number.isSafeInteger(input.version) ||
    input.version < 0
  )
    return {
      error:
        "Controleer de ingevulde velden. Vul bij een autorit auto en bestuurder in en bij verspilling product en hoeveelheid.",
    };
  const { data, error } = await supabase
    .rpc("save_daily_summary", {
      p_location: input.locationId,
      p_date: input.date,
      p_version: input.version,
      p_payload: input.values,
    })
    .retry(false);
  if (error) return failure(error, "daily_save_failed");
  revalidatePath("/dagoverzicht");
  return { success: "Dagoverzicht opgeslagen.", summary: data };
}
