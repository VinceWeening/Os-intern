"use server";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { validateDefinition, type FormDefinition } from "./form-definition";
import { managementError } from "@/lib/admin/validation";
export async function publishCashForm(input: {
  locationId: string;
  expectedId: string | null;
  definition: FormDefinition;
  reason: string;
}) {
  const { supabase } = await requireAdmin();
  const invalid = validateDefinition(input?.definition);
  if (invalid) return { error: invalid };
  if (
    typeof input.reason !== "string" ||
    input.reason.trim().length < 3 ||
    input.reason.trim().length > 500
  )
    return { error: "Vul een reden van 3 tot 500 tekens in." };
  const { error } = await supabase
    .rpc("admin_publish_cash_form", {
      p_location_id: input.locationId,
      p_definition: input.definition,
      p_expected_id: input.expectedId,
      p_reason: input.reason.trim(),
    })
    .retry(false);
  if (error) {
    console.error(
      JSON.stringify({ event: "cash_form_publish_failed", code: error.code }),
    );
    return { error: managementError(error) };
  }
  revalidatePath("/", "layout");
  return {
    success:
      "Nieuwe formulierversie gepubliceerd. Nieuwe tellingen gebruiken deze versie; bestaande tellingen behouden hun eigen versie.",
  };
}
