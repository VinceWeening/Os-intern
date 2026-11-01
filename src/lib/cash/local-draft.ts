import { DENOMINATIONS, MONEY_FIELDS, type CashDraft } from "./model";
export const LOCAL_PREFIX = "os-werkplek:cash:v1:";
export type LocalDraft = {
  schema: 1;
  id: string;
  userId: string;
  version: number;
  draft: CashDraft;
  savedAt: string;
  submissionKey: string | null;
};
export function localKey(userId: string, id: string) {
  return `${LOCAL_PREFIX}${userId}:${id}`;
}
export function readLocalDraft(
  raw: string | null,
  userId: string,
  id?: string,
): LocalDraft | null {
  try {
    if (raw && raw.length > 100000) return null;
    const value = JSON.parse(raw ?? "null");
    if (
      value?.schema !== 1 ||
      value.userId !== userId ||
      (id && value.id !== id) ||
      !Number.isSafeInteger(value.version) ||
      value.version < 0 ||
      typeof value.draft?.workDate !== "string" ||
      !value.draft?.rows ||
      !value.draft?.amounts
    )
      return null;
    if (
      !["locationId", "opening", "openingReason", "explanation", "notes"].every(
        (key) => typeof value.draft[key] === "string",
      )
    )
      return null;
    if (
      !DENOMINATIONS.every(
        (d) =>
          typeof value.draft.rows[d]?.quantity === "string" &&
          typeof value.draft.rows[d]?.amount === "string" &&
          ["quantity", "amount"].includes(value.draft.rows[d]?.edited),
      )
    )
      return null;
    if (
      !MONEY_FIELDS.every(
        (field) => typeof value.draft.amounts[field.key] === "string",
      )
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
