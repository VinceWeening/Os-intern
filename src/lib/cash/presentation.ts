import defaultForm from "./default-form.json";
import type { FormDefinition, FormField } from "./form-definition";

const paperOrder = [
  "turnover_cents",
  "sold_vouchers_cents",
  "required",
  "ideal_cents",
  "shop_vouchers_cents",
  "redeemed_vouchers_cents",
  "pax_cents",
  "paynl_cents",
  "cash",
  "result",
  "register",
];

// Temporarily left out of entry and overview. Only hidden while it holds
// exactly 0 (its default), so the sums stay right; an empty field or a real
// amount from an older closing still shows.
export const HIDDEN_FOR_NOW = ["shop_vouchers_cents"];
export function hiddenForNow(key: string, value: number | null | undefined) {
  return HIDDEN_FOR_NOW.includes(key) && value === 0;
}

// Only the unchanged standard field order gets the familiar paper layout.
// A deliberately configured custom order remains the administrator's choice.
export function paperFields(definition?: FormDefinition): FormField[] {
  const fields = definition?.fields ?? (defaultForm as FormDefinition).fields;
  const standardOrder = defaultForm.fields.map((field) => field.key).join("|");
  if (fields.map((field) => field.key).join("|") !== standardOrder)
    return fields;
  return paperOrder.map((key) => fields.find((field) => field.key === key)!);
}
export function formulaLabel(field: FormField, fields: FormField[]) {
  return field.terms
    .map((term, index) => {
      const label =
        term.key === "counted"
          ? "Totaal geteld"
          : term.key === "opening"
            ? "Startsaldo"
            : (fields.find((f) => f.key === term.key)?.label ?? term.key);
      return `${term.sign === -1 ? "− " : index ? "+ " : ""}${label}`;
    })
    .join(" ");
}
export function paperSign(field: FormField, fields: FormField[]) {
  if (field.key === "sold_vouchers_cents") {
    const term = fields
      .find((f) => f.key === "required")
      ?.terms.find((t) => t.key === field.key);
    return term?.sign === 1 ? "+" : term?.sign === -1 ? "−" : "";
  }
  if (field.kind === "input" || field.key === "cash") {
    const term = fields
      .find((f) => f.key === "result")
      ?.terms.find((t) => t.key === field.key);
    return term?.sign === -1 ? "−" : term?.sign === 1 ? "+" : "";
  }
  return "";
}
