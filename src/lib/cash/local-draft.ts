import { validateDefinition } from "./form-definition";
import { DENOMINATIONS, MONEY_FIELDS, type CashDraft } from "./model";
export const LOCAL_PREFIX = "os-werkplek:cash:v1:";
export const DRAFT_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
export type LocalDraft = {
  schema: 1;
  id: string;
  userId: string;
  version: number;
  draft: CashDraft;
  savedAt: string;
  submissionKey: string | null;
};
export function localKey(userId: string, _id?: string) {
  return `${LOCAL_PREFIX}${userId}:latest`;
}
type DraftStorage = Pick<
  Storage,
  "length" | "key" | "getItem" | "setItem" | "removeItem"
>;

// Migrate the old per-closing keys too. Only this account's newest recovery
// copy remains; an uncertain submission is retained until its outcome is known.
export function tidyLocalDrafts(
  storage: DraftStorage,
  userId: string,
  now = Date.now(),
): LocalDraft | null {
  const keys = Array.from({ length: storage.length }, (_, i) =>
    storage.key(i),
  ).filter(
    (key): key is string =>
      key !== null && key.startsWith(`${LOCAL_PREFIX}${userId}:`),
  );
  const candidates = keys
    .map((key) => readLocalDraft(storage.getItem(key), userId))
    .filter(
      (item): item is LocalDraft =>
        !!item &&
        Number.isFinite(Date.parse(item.savedAt)) &&
        (item.submissionKey !== null ||
          Date.parse(item.savedAt) > now - DRAFT_RETENTION_MS),
    )
    .sort(
      (a, b) =>
        Number(b.submissionKey !== null) - Number(a.submissionKey !== null) ||
        Date.parse(b.savedAt) - Date.parse(a.savedAt),
    );
  const latest = candidates[0] ?? null;
  const destination = localKey(userId);
  if (latest) storage.setItem(destination, JSON.stringify(latest));
  for (const key of keys)
    if (!latest || key !== destination) storage.removeItem(key);
  return latest;
}

export function writeLocalDraft(storage: DraftStorage, item: LocalDraft) {
  const previous = tidyLocalDrafts(storage, item.userId);
  if (previous?.submissionKey && previous.id !== item.id)
    throw new Error("RESOLVE_PENDING_SUBMISSION_FIRST");
  storage.setItem(localKey(item.userId), JSON.stringify(item));
}

export function removeLocalDraft(
  storage: DraftStorage,
  userId: string,
  id: string,
) {
  const current = readLocalDraft(storage.getItem(localKey(userId)), userId);
  if (current?.id === id) storage.removeItem(localKey(userId));
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
      typeof value.id !== "string" ||
      typeof value.savedAt !== "string" ||
      !Number.isFinite(Date.parse(value.savedAt)) ||
      (value.submissionKey !== null &&
        typeof value.submissionKey !== "string") ||
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
    if (
      value.draft.formDefinition &&
      (validateDefinition(value.draft.formDefinition) ||
        !value.draft.customAmounts ||
        !Object.values(value.draft.customAmounts).every(
          (v) => typeof v === "string",
        ))
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
