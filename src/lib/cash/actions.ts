"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { isSharedAccount } from "@/lib/auth/permissions";
import { validateDraft, type CashDraft } from "./model";
import type { CashSnapshot } from "@/lib/supabase/database.types";

type Result = {
  error?: string;
  fields?: Record<string, string>;
  snapshot?: CashSnapshot;
  uncertain?: boolean;
};
function errorMessage(error: { code?: string; message?: string }) {
  if (error.code === "PT409")
    return "Deze afslag is intussen gewijzigd. Je invoer blijft bewaard; bekijk eerst de nieuwste serverversie.";
  if (error.code === "23505")
    return "Er bestaat al een definitieve afslag voor deze vestiging en werkdatum. Je invoer blijft bewaard.";
  if (error.code === "42501")
    return "Je mag deze afslag niet wijzigen, of hij is al ingediend. Vernieuw de gegevens.";
  const messages: Record<string, string> = {
    NEGATIVE_CASH: "Geteld geld is lager dan het startsaldo.",
    OPENING_REASON_REQUIRED:
      "Een reden voor het aangepaste startsaldo is verplicht.",
    SHORTAGE_REASON_REQUIRED: "Bij een tekort is een toelichting verplicht.",
    REOPEN_REASON_REQUIRED:
      "Vul een reden van minimaal drie tekens in om te heropenen.",
    FINAL_IDENTITY_LOCKED:
      "Vestiging en werkdatum blijven na indiening vaststaan.",
    EMPLOYEE_REQUIRED: "Kies eerst je naam bij Medewerker.",
    EMPLOYEE_FORBIDDEN:
      "Deze medewerker hoort niet bij deze vestiging. Kies je naam opnieuw.",
  };
  return (
    messages[error.message ?? ""] ??
    "Opslaan is niet bevestigd. Je invoer blijft lokaal bewaard. Controleer je verbinding en de serverversie voordat je opnieuw probeert."
  );
}
export async function saveCash(input: {
  id: string;
  version: number;
  draft: CashDraft;
  submit: boolean;
  submissionKey: string | null;
}): Promise<Result> {
  const { supabase, role } = await requirePermission("cash.submit");
  if (
    isSharedAccount(role) &&
    !/^[0-9a-f-]{36}$/i.test(input?.draft?.employeeId ?? "")
  )
    return {
      error: "Kies eerst je naam bij Medewerker.",
      fields: { employee: "Kies je naam." },
    };
  if (
    !/^[0-9a-f-]{36}$/i.test(input?.id ?? "") ||
    !Number.isSafeInteger(input.version) ||
    input.version < 0
  )
    return { error: "Ongeldige afslag." };
  let checked: ReturnType<typeof validateDraft>;
  try {
    const { data: existing } = await supabase
      .from("cash_closings")
      .select("opening_default_cents")
      .eq("id", input.id)
      .maybeSingle();
    const { data: location } = await supabase
      .from("locations")
      .select("*")
      .eq("id", input.draft.locationId)
      .single();
    if (!location) return { error: "Geen toegang tot deze vestiging." };
    checked = validateDraft(
      input.draft,
      input.submit,
      existing?.opening_default_cents ??
        location.default_opening_cents ??
        15000,
    );
  } catch {
    return { error: "Controleer de invoer en je verbinding." };
  }
  if (!checked.valid)
    return {
      error: "Controleer de gemarkeerde velden.",
      fields: checked.errors,
    };
  const { data, error } = await supabase
    .rpc("save_cash_closing", {
      p_id: input.id,
      p_expected_version: input.version,
      p_payload: checked.payload,
      p_submit: input.submit,
      p_submission_key: input.submissionKey,
    })
    .retry(false);
  if (error) {
    console.error(
      JSON.stringify({ event: "cash_save_failed", code: error.code }),
    );
    return { error: errorMessage(error), uncertain: !error.code };
  }
  revalidatePath("/kassa-afslag", "layout");
  return { snapshot: data };
}
export async function setDefaultLocation(
  locationId: string,
): Promise<{ error?: string }> {
  const { supabase } = await requirePermission("cash.submit");
  if (!/^[0-9a-f-]{36}$/i.test(locationId))
    return { error: "Ongeldige vestiging." };
  const { error } = await supabase.rpc("set_default_location", {
    p_location: locationId,
  });
  if (error) return { error: "Standaardvestiging opslaan is niet gelukt." };
  return {};
}
export async function transitionCash(
  id: string,
  version: number,
  action: "review" | "reopen",
  reason: string,
): Promise<Result> {
  const { supabase } = await requirePermission(
    action === "review" ? "cash.review" : "cash.reopen",
  );
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !Number.isSafeInteger(version) ||
    !["review", "reopen"].includes(action)
  )
    return { error: "Ongeldige actie." };
  const { data, error } = await supabase
    .rpc("transition_cash_closing", {
      p_id: id,
      p_expected_version: version,
      p_action: action,
      p_reason: action === "reopen" ? reason : null,
    })
    .retry(false);
  if (error) {
    console.error(
      JSON.stringify({ event: "cash_transition_failed", code: error.code }),
    );
    return { error: errorMessage(error) };
  }
  revalidatePath("/kassa-afslag", "layout");
  return { snapshot: data };
}
