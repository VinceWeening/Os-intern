export type FormField = {
  key: string;
  label: string;
  kind: "input" | "calculated";
  required: boolean;
  minimum: number | null;
  default: number | null;
  terms: { key: string; sign: 1 | -1 }[];
};
export type FormDefinition = { opening: number; fields: FormField[] };
export type FormVersion = {
  id: string;
  location_id: string;
  version: number;
  definition: FormDefinition;
  created_at: string;
};
export const SYSTEM_FIELDS = ["counted", "opening"];
export const OUTPUT_FIELDS = ["cash", "required", "result", "register"];
export function validateDefinition(value: FormDefinition): string | null {
  if (
    !value ||
    !Number.isSafeInteger(value.opening) ||
    value.opening < 0 ||
    value.opening > 100000000 ||
    !Array.isArray(value.fields) ||
    value.fields.length < 4 ||
    value.fields.length > 30
  )
    return "Controleer het startsaldo en het aantal velden (4–30).";
  const known = new Set(SYSTEM_FIELDS);
  for (const field of value.fields) {
    if (
      !field ||
      !/^[a-z][a-z0-9_]{0,39}$/.test(field.key) ||
      known.has(field.key) ||
      typeof field.label !== "string" ||
      !field.label.trim() ||
      field.label.length > 100 ||
      !["input", "calculated"].includes(field.kind) ||
      typeof field.required !== "boolean"
    )
      return "Geef elk veld een unieke sleutel en naam.";
    if (
      [field.default, field.minimum].some(
        (n) =>
          n !== null && (!Number.isSafeInteger(n) || n < 0 || n > 100000000),
      )
    )
      return "Standaardbedrag en minimum moeten geldige positieve bedragen zijn.";
    if (
      field.default !== null &&
      field.minimum !== null &&
      field.default < field.minimum
    )
      return "Een standaardbedrag mag niet lager zijn dan het minimum.";
    if (
      !Array.isArray(field.terms) ||
      field.terms.length > 30 ||
      (field.kind === "calculated" &&
        (!field.terms.length ||
          field.terms.some(
            (t) => !t || !known.has(t.key) || ![1, -1].includes(t.sign),
          )))
    )
      return "Een berekening mag alleen naar eerdere velden verwijzen. Gebruik minimaal één term.";
    if (OUTPUT_FIELDS.includes(field.key) && field.kind !== "calculated")
      return "De vier vaste uitkomsten moeten berekeningen blijven.";
    known.add(field.key);
  }
  return OUTPUT_FIELDS.every((key) => known.has(key))
    ? null
    : "Contant, benodigd, resultaat en kassabedrag moeten aanwezig blijven.";
}
export function evaluateDefinition(
  definition: FormDefinition,
  inputs: Record<string, number | null>,
  counted: number,
  opening: number,
  final = false,
) {
  const values: Record<string, number | null> = { counted, opening };
  const errors: Record<string, string> = {};
  for (const field of definition.fields) {
    let value =
      field.kind === "input"
        ? (inputs[field.key] ?? null)
        : field.terms.reduce<number | null>(
            (sum, term) =>
              sum === null || values[term.key] == null
                ? null
                : sum + values[term.key]! * term.sign,
            0,
          );
    if (field.kind === "input" && value === null && !field.required) value = 0;
    values[field.key] = value;
    if (
      value !== null &&
      (!Number.isSafeInteger(value) || Math.abs(value) > 1000000000)
    )
      errors[field.key] = "Bedrag is te groot.";
    if (
      final &&
      value === null &&
      (field.required || OUTPUT_FIELDS.includes(field.key))
    )
      errors[field.key] = "Vul dit veld in.";
    if (
      final &&
      value !== null &&
      field.minimum !== null &&
      value < field.minimum
    )
      errors[field.key] =
        `Bedrag is lager dan het ingestelde minimum (€ ${(field.minimum / 100).toFixed(2)}).`;
  }
  return { values, errors };
}
