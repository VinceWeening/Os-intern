import {
  evaluateDefinition,
  type FormDefinition,
  type FormVersion,
} from "./form-definition";
export const DENOMINATIONS = [
  10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5,
] as const;
export const MAX_CENTS = 100_000_000;
export const MONEY_FIELDS = [
  { key: "turnover_cents", label: "Omzet op de kassa" },
  { key: "sold_vouchers_cents", label: "Verkochte cadeaubonnen" },
  { key: "ideal_cents", label: "iDEAL" },
  { key: "pax_cents", label: "PAX dagafsluiting" },
  { key: "paynl_cents", label: "Pay.nl" },
  { key: "shop_vouchers_cents", label: "Winkelbonnen" },
  { key: "redeemed_vouchers_cents", label: "Verzilverde cadeaubonnen" },
] as const;
export type MoneyKey = (typeof MONEY_FIELDS)[number]["key"];
export type Amounts = Record<MoneyKey, number | null>;
export type CashPayload = Amounts & {
  form_definition_id?: string | null;
  form_schema?: FormDefinition | null;
  custom_inputs?: Record<string, number | null>;
  location_id: string;
  work_date: string;
  counts: Record<string, number>;
  opening_cents: number;
  opening_reason: string;
  difference_explanation: string;
  notes: string;
  // Only used by a shared computer account; ignored for personal accounts.
  employee_id?: string | null;
};
export type CountRow = {
  quantity: string;
  amount: string;
  edited: "quantity" | "amount";
};
export type CashDraft = {
  formId?: string;
  formDefinition?: FormDefinition;
  customAmounts?: Record<string, string>;
  locationId: string;
  workDate: string;
  rows: Record<string, CountRow>;
  opening: string;
  openingReason: string;
  amounts: Record<MoneyKey, string>;
  explanation: string;
  notes: string;
  // Chosen employee on a shared computer account.
  employeeId?: string;
};
export type CashClosing = Amounts & {
  form_definition_id?: string | null;
  form_schema?: FormDefinition | null;
  custom_inputs?: Record<string, number | null>;
  custom_totals?: Record<string, number | null>;
  id: string;
  location_id: string;
  work_date: string;
  employee_id: string;
  employee_name: string;
  status: "draft" | "submitted" | "reviewed";
  counted_cents: number;
  opening_cents: number;
  opening_default_cents: number;
  opening_reason: string;
  cash_cents: number;
  required_cents: number | null;
  result_cents: number | null;
  register_cents: number | null;
  difference_explanation: string;
  notes: string;
  version: number;
  form_version: number;
  submission_key: string | null;
  created_by?: string | null;
  first_submitted_at: string | null;
  last_submitted_at: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};
export type CashEvent = {
  id: string;
  closing_id: string;
  actor_id: string;
  occurred_at: string;
  action: string;
  reason: string | null;
  before_values: unknown;
  after_values: unknown;
  actor_name: string;
};
export type Totals = {
  counted: number;
  opening: number;
  cash: number;
  required: number | null;
  result: number | null;
  register: number | null;
};

export function inputMoney(cents: number): string {
  return `${cents < 0 ? "-" : ""}${Math.floor(Math.abs(cents) / 100)},${String(Math.abs(cents) % 100).padStart(2, "0")}`;
}
export function euro(cents: number | null): string {
  return cents === null ? "—" : `€ ${inputMoney(cents)}`;
}
export function parseMoney(value: string): number | null {
  if (typeof value !== "string" || !/^\d+(?:[,.]\d{1,2})?$/.test(value.trim()))
    return null;
  const [whole, fraction = ""] = value.trim().split(/[,.]/);
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= MAX_CENTS ? cents : null;
}
export function normalizeRow(
  denomination: number,
  row: CountRow,
): { row: CountRow; quantity: number } | null {
  if (
    !row ||
    typeof row.quantity !== "string" ||
    typeof row.amount !== "string"
  )
    return null;
  // Een leeg veld betekent: niets van deze coupure geteld.
  if ((row.edited === "amount" ? row.amount : row.quantity).trim() === "")
    return {
      quantity: 0,
      row: { quantity: "", amount: "", edited: "quantity" },
    };
  const amount = row.edited === "amount" ? parseMoney(row.amount) : null;
  const quantity =
    row.edited === "amount"
      ? amount === null || amount % denomination !== 0
        ? NaN
        : amount / denomination
      : /^\d+$/.test(row.quantity.trim())
        ? Number(row.quantity)
        : NaN;
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 10000)
    return null;
  return {
    quantity,
    row: {
      quantity: String(quantity),
      amount: inputMoney(quantity * denomination),
      edited: row.edited,
    },
  };
}
export function calculate(payload: CashPayload): Totals {
  const counted = DENOMINATIONS.reduce(
    (total, denomination) =>
      total + denomination * (payload.counts[denomination] ?? 0),
    0,
  );
  if (payload.form_schema) {
    const { values } = evaluateDefinition(
      payload.form_schema,
      payload.custom_inputs ?? {},
      counted,
      payload.opening_cents,
    );
    return {
      counted,
      opening: payload.opening_cents,
      cash: values.cash ?? counted - payload.opening_cents,
      required: values.required,
      result: values.result,
      register: values.register,
    };
  }
  const cash = counted - payload.opening_cents;
  const required =
    payload.turnover_cents === null || payload.sold_vouchers_cents === null
      ? null
      : payload.turnover_cents + payload.sold_vouchers_cents;
  const complete = MONEY_FIELDS.every((field) => payload[field.key] !== null);
  return {
    counted,
    opening: payload.opening_cents,
    cash,
    required,
    result:
      !complete || required === null
        ? null
        : required -
          payload.ideal_cents! -
          payload.shop_vouchers_cents! -
          payload.redeemed_vouchers_cents! -
          payload.pax_cents! -
          payload.paynl_cents! -
          cash,
    register:
      payload.pax_cents === null || payload.paynl_cents === null
        ? null
        : payload.pax_cents +
          payload.paynl_cents +
          cash +
          payload.opening_cents,
  };
}
export function emptyDraft(
  locationId: string,
  date: string,
  opening = 15000,
  form?: FormVersion,
): CashDraft {
  return {
    formId: form?.id,
    formDefinition: form?.definition,
    customAmounts: form
      ? Object.fromEntries(
          form.definition.fields
            .filter((f) => f.kind === "input")
            .map((f) => [
              f.key,
              f.default === null ? "" : inputMoney(f.default),
            ]),
        )
      : undefined,
    locationId,
    workDate: date,
    opening: inputMoney(opening),
    openingReason: "",
    explanation: "",
    notes: "",
    employeeId: "",
    rows: Object.fromEntries(
      DENOMINATIONS.map((d) => [
        d,
        { quantity: "", amount: "", edited: "quantity" },
      ]),
    ),
    amounts: Object.fromEntries(
      MONEY_FIELDS.map((field) => [field.key, "0,00"]),
    ) as Record<MoneyKey, string>,
  };
}
export function closingToDraft(
  closing: CashClosing,
  counts: Record<string, number>,
): CashDraft {
  return {
    formId: closing.form_definition_id ?? undefined,
    formDefinition: closing.form_schema ?? undefined,
    customAmounts: closing.form_schema
      ? Object.fromEntries(
          closing.form_schema.fields
            .filter((f) => f.kind === "input")
            .map((f) => [
              f.key,
              closing.custom_inputs?.[f.key] == null
                ? ""
                : inputMoney(closing.custom_inputs[f.key]!),
            ]),
        )
      : undefined,
    locationId: closing.location_id,
    workDate: closing.work_date,
    opening: inputMoney(closing.opening_cents),
    openingReason: closing.opening_reason,
    explanation: closing.difference_explanation,
    notes: closing.notes,
    employeeId: closing.employee_id,
    rows: Object.fromEntries(
      DENOMINATIONS.map((d) => [
        d,
        {
          quantity: counts[d] ? String(counts[d]) : "",
          amount: counts[d] ? inputMoney(d * counts[d]) : "",
          edited: "quantity",
        },
      ]),
    ),
    amounts: Object.fromEntries(
      MONEY_FIELDS.map((field) => [
        field.key,
        closing[field.key] === null ? "" : inputMoney(closing[field.key]!),
      ]),
    ) as Record<MoneyKey, string>,
  };
}
export function validateDraft(
  draft: CashDraft,
  final: boolean,
  defaultOpening: number,
) {
  const errors: Record<string, string> = {};
  const counts: Record<string, number> = {};
  for (const denomination of DENOMINATIONS) {
    const normalized = normalizeRow(denomination, draft.rows[denomination]);
    if (!normalized)
      errors[`count-${denomination}`] =
        "Vul een geheel aantal of een exact bedrag voor deze coupure in.";
    else counts[denomination] = normalized.quantity;
  }
  const amounts = {} as Amounts;
  for (const field of MONEY_FIELDS) {
    const raw = draft.formDefinition ? "0" : draft.amounts[field.key];
    amounts[field.key] = parseMoney(raw);
    if ((raw.trim() !== "" || final) && amounts[field.key] === null)
      errors[field.key] =
        "Vul een bedrag vanaf €0 in, met maximaal twee decimalen.";
  }
  const opening = parseMoney(draft.opening);
  if (opening === null)
    errors.opening = "Vul een geldig startsaldo vanaf €0 in.";
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.workDate) ||
    Number.isNaN(Date.parse(`${draft.workDate}T12:00:00Z`)) ||
    new Date(`${draft.workDate}T12:00:00Z`).toISOString().slice(0, 10) !==
      draft.workDate
  )
    errors.date = "Kies een geldige werkdatum.";
  if (!/^[0-9a-f-]{36}$/i.test(draft.locationId))
    errors.location = "Kies een vestiging.";
  for (const [key, value] of [
    ["openingReason", draft.openingReason],
    ["explanation", draft.explanation],
    ["notes", draft.notes],
  ]) {
    if (typeof value !== "string" || value.length > 4000)
      errors[key] = "Gebruik maximaal 4000 tekens.";
  }
  const payload: CashPayload = {
    ...amounts,
    form_definition_id: draft.formId ?? null,
    form_schema: draft.formDefinition,
    custom_inputs: draft.formDefinition
      ? Object.fromEntries(
          draft.formDefinition.fields
            .filter((f) => f.kind === "input")
            .map((f) => {
              const raw = draft.customAmounts?.[f.key] ?? "";
              const value = parseMoney(raw);
              if (raw.trim() && value === null)
                errors[f.key] = "Vul een geldig bedrag vanaf € 0 in.";
              return [f.key, value];
            }),
        )
      : undefined,
    location_id: draft.locationId,
    work_date: draft.workDate,
    counts,
    opening_cents: opening ?? 0,
    opening_reason: draft.openingReason.trim(),
    difference_explanation: draft.explanation.trim(),
    notes: draft.notes.trim(),
    employee_id: draft.employeeId || null,
  };
  const totals = calculate(payload);
  if (draft.formDefinition)
    Object.assign(
      errors,
      evaluateDefinition(
        draft.formDefinition,
        payload.custom_inputs ?? {},
        totals.counted,
        payload.opening_cents,
        final,
      ).errors,
    );
  if (final) {
    if (totals.cash < 0)
      errors.cash =
        "Geteld geld is lager dan het startsaldo. Controleer de telling of het startsaldo.";
    if (opening !== defaultOpening && !payload.opening_reason)
      errors.openingReason = "Leg uit waarom het startsaldo afwijkt.";
    if (
      totals.result !== null &&
      totals.result > 0 &&
      !payload.difference_explanation
    )
      errors.explanation = "Bij een tekort is een toelichting verplicht.";
    // Een concept bewaart de toelichting; definitief alleen als er een tekort is.
    if (totals.result === null || totals.result <= 0)
      payload.difference_explanation = "";
  }
  return { payload, totals, errors, valid: Object.keys(errors).length === 0 };
}
