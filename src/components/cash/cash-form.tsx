"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DENOMINATIONS,
  MONEY_FIELDS,
  emptyDraft,
  closingToDraft,
  validateDraft,
  normalizeRow,
  euro,
  inputMoney,
  parseMoney,
  type CashDraft,
  type CountRow,
} from "@/lib/cash/model";
import {
  tidyLocalDrafts,
  writeLocalDraft,
  removeLocalDraft,
  localKey,
  type LocalDraft,
} from "@/lib/cash/local-draft";
import { saveCash, setDefaultLocation } from "@/lib/cash/actions";
import type { CashSnapshot, Location } from "@/lib/supabase/database.types";
import { CashGlance, CashOverview } from "./totals";
import { PaymentTable } from "./payment-table";
import "./paper-entry.css";
import { CashSheet } from "./cash-sheet";

import {
  evaluateDefinition,
  type FormDefinition,
  type FormVersion,
} from "@/lib/cash/form-definition";
import defaultForm from "@/lib/cash/default-form.json";

type CountMode = CountRow["edited"];
const COUNT_MODE_KEY = "os-werkplek:tellen-in";
type Props = {
  forms?: FormVersion[];
  id: string;
  userId: string;
  name: string;
  locations: Location[];
  date: string;
  locationId: string;
  defaultLocationId?: string | null;
  initial: CashSnapshot | null;
  // Only for a shared computer account: who may close each location.
  staff?: Record<string, { id: string; full_name: string }[]> | null;
};
export function CashForm({
  forms = [],
  id,
  userId,
  name,
  locations,
  date,
  locationId,
  defaultLocationId = null,
  initial,
  staff = null,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<CashDraft>(() =>
    initial
      ? closingToDraft(initial.closing, initial.counts)
      : emptyDraft(
          locationId,
          date,
          locations.find((l) => l.id === locationId)?.default_opening_cents ??
            15000,
          forms.find(
            (f) =>
              f.id === locations.find((l) => l.id === locationId)?.cash_form_id,
          ),
        ),
  );
  const [version, setVersion] = useState(initial?.closing.version ?? 0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState(false);
  const [online, setOnline] = useState(true);
  const [localError, setLocalError] = useState(false);
  const [recovery, setRecovery] = useState<LocalDraft | null>(null);
  const [submissionKey, setSubmissionKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<CashSnapshot | null>(null);
  const [countMode, setCountMode] = useState<CountMode>("quantity");
  const [standardLocation, setStandardLocation] = useState(defaultLocationId);
  const [savingDefault, setSavingDefault] = useState(false);
  const saving = useRef(false);
  const defaultOpening =
    initial?.closing.opening_default_cents ??
    locations.find((l) => l.id === draft.locationId)?.default_opening_cents ??
    15000;
  const checked = validateDraft(draft, false, defaultOpening);
  const customValues = draft.formDefinition
    ? evaluateDefinition(
        draft.formDefinition,
        checked.payload.custom_inputs ?? {},
        checked.totals.counted,
        checked.payload.opening_cents,
      ).values
    : {};
  // Older drafts have no stored form; they follow the standard calculation.
  const overviewDefinition =
    draft.formDefinition ?? (defaultForm as FormDefinition);
  const overviewInputs = draft.formDefinition
    ? (checked.payload.custom_inputs ?? {})
    : Object.fromEntries(
        MONEY_FIELDS.map((f) => [f.key, checked.payload[f.key]]),
      );
  // Omzet = what makes up "Totaal benodigd"; every other amount is a payment.
  const turnoverKeys =
    overviewDefinition.fields
      .find((f) => f.key === "required")
      ?.terms.filter((t) => t.sign === 1)
      .map((t) => t.key) ?? [];
  const paymentKeys = overviewDefinition.fields
    .filter((f) => f.kind === "input" && !turnoverKeys.includes(f.key))
    .map((f) => f.key);
  const locationName =
    locations.find((l) => l.id === draft.locationId)?.name ?? "";
  const shared = Boolean(staff);
  const staffHere = staff?.[draft.locationId] ?? [];
  const employeeName = shared
    ? (staffHere.find((s) => s.id === draft.employeeId)?.full_name ?? "")
    : name;
  // On the shared computer the closing needs a name before it can be saved.
  function withEmployee(found: Record<string, string>) {
    return shared && !staffHere.some((s) => s.id === draft.employeeId)
      ? { employee: "Kies je naam bij Medewerker.", ...found }
      : found;
  }
  const openingDiffers = parseMoney(draft.opening) !== defaultOpening;
  const shortage =
    checked.totals.counted > 0 &&
    checked.totals.result !== null &&
    checked.totals.result > 0;
  const emptyAmounts = draft.formDefinition
    ? draft.formDefinition.fields.filter(
        (f) =>
          f.kind === "input" &&
          f.required &&
          !(draft.customAmounts?.[f.key] ?? "").trim(),
      ).length
    : MONEY_FIELDS.filter((field) => draft.amounts[field.key].trim() === "")
        .length;
  const lockedIdentity = Boolean(initial?.closing.first_submitted_at);
  const blocked = busy || submissionKey !== null || Boolean(recovery && !dirty);
  const key = localKey(userId, id);
  function persist(
    value: CashDraft = draft,
    currentVersion = version,
    pendingKey = submissionKey,
  ) {
    try {
      const item: LocalDraft = {
        schema: 1,
        id,
        userId,
        version: currentVersion,
        draft: value,
        savedAt: new Date().toISOString(),
        submissionKey: pendingKey,
      };
      writeLocalDraft(localStorage, item);
      setLocalError(false);
    } catch {
      setLocalError(true);
    }
  }
  useEffect(() => {
    try {
      if (localStorage.getItem(COUNT_MODE_KEY) === "amount")
        setCountMode("amount");
    } catch {
      /* Alleen een voorkeur; standaard blijft aantal. */
    }
  }, []);
  useEffect(() => {
    setOnline(navigator.onLine);
    try {
      const found = tidyLocalDrafts(localStorage, userId);
      setRecovery(found?.id === id ? found : null);
    } catch {
      setLocalError(true);
    }
    const yes = () => setOnline(true),
      no = () => setOnline(false);
    window.addEventListener("online", yes);
    window.addEventListener("offline", no);
    return () => {
      window.removeEventListener("online", yes);
      window.removeEventListener("offline", no);
    };
  }, [key, userId, id]);
  useEffect(() => {
    if (dirty) persist();
  }, [draft, dirty, version, submissionKey]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function change(update: (value: CashDraft) => CashDraft) {
    setDraft(update);
    setDirty(true);
    setSaveState("dirty");
    setMessage("");
    setReview(false);
  }
  function error(field: string) {
    return errors[field] ? (
      <small className="field-error" id={`error-${field}`}>
        {errors[field]}
      </small>
    ) : null;
  }
  function normalize(denomination: number) {
    const row = normalizeRow(denomination, draft.rows[denomination]);
    if (row) {
      setDraft((old) => ({
        ...old,
        rows: { ...old.rows, [denomination]: row.row },
      }));
      setErrors((old) => {
        const next = { ...old };
        delete next[`count-${denomination}`];
        return next;
      });
    } else
      setErrors((old) => ({
        ...old,
        [`count-${denomination}`]:
          draft.rows[denomination].edited === "amount"
            ? `Bij ${euro(denomination)} moet het bedrag een veelvoud van ${euro(denomination)} zijn.`
            : "Vul een heel aantal stuks in, maximaal 10.000.",
      }));
  }
  function setRow(denomination: number, update: (row: CountRow) => CountRow) {
    change((old) => ({
      ...old,
      rows: { ...old.rows, [denomination]: update(old.rows[denomination]) },
    }));
    setErrors((old) => {
      const next = { ...old };
      delete next[`count-${denomination}`];
      return next;
    });
  }
  function step(denomination: number, by: number) {
    setRow(denomination, (row) => {
      const current = normalizeRow(denomination, row)?.quantity ?? 0;
      const next = Math.min(10000, Math.max(0, current + by));
      return {
        quantity: next ? String(next) : "",
        amount: next ? inputMoney(next * denomination) : "",
        edited: "quantity",
      };
    });
  }
  function switchMode(mode: CountMode) {
    if (mode === countMode) return;
    const invalid = DENOMINATIONS.filter(
      (d) => !normalizeRow(d, draft.rows[d]),
    );
    if (invalid.length) {
      setErrors((old) => ({
        ...old,
        ...Object.fromEntries(
          invalid.map((d) => [
            `count-${d}`,
            old[`count-${d}`] ?? "Verbeter dit veld voordat je wisselt.",
          ]),
        ),
      }));
      return;
    }
    setDraft((old) => ({
      ...old,
      rows: Object.fromEntries(
        DENOMINATIONS.map((d) => [
          d,
          { ...normalizeRow(d, old.rows[d])!.row, edited: mode },
        ]),
      ),
    }));
    setCountMode(mode);
    try {
      localStorage.setItem(COUNT_MODE_KEY, mode);
    } catch {
      /* Alleen een voorkeur. */
    }
  }
  async function save(final: boolean) {
    if (saving.current) return;
    const validation = validateDraft(draft, final, defaultOpening);
    const found = withEmployee(validation.errors);
    setErrors(found);
    if (Object.keys(found).length) {
      setMessage("Controleer de gemarkeerde velden.");
      return;
    }
    if (!navigator.onLine) {
      persist();
      setSaveState("failed");
      setMessage(
        "Je bent offline. De invoer staat op dit apparaat, nog niet centraal.",
      );
      return;
    }
    saving.current = true;
    setBusy(true);
    setSaveState("saving");
    setMessage("");
    const token = final ? (submissionKey ?? crypto.randomUUID()) : null;
    if (final) setSubmissionKey(token);
    persist(draft, version, token);
    try {
      const result = await saveCash({
        id,
        version,
        draft,
        submit: final,
        submissionKey: token,
      });
      if (result.error || !result.snapshot) {
        setSaveState("failed");
        setMessage(result.error ?? "Opslaan is niet bevestigd.");
        setErrors(result.fields ?? {});
        if (!result.uncertain) setSubmissionKey(null);
        return;
      }
      setVersion(result.snapshot.closing.version);
      setDirty(false);
      setSaveState("saved");
      setSubmissionKey(null);
      setRecovery(null);
      try {
        removeLocalDraft(localStorage, userId, id);
      } catch {
        /* No server data is lost. */
      }
      if (final) {
        setSubmitted(result.snapshot);
        setReview(false);
        router.push("/kassa-afslag?melding=ingediend");
      } else {
        setMessage(
          "Concept centraal opgeslagen. Het vervalt na 3 dagen zonder wijziging.",
        );
        if (!initial) router.replace(`/kassa-afslag/${id}`);
      }
    } catch {
      setSaveState("failed");
      setMessage(
        "De aanvraag kon niet worden bevestigd. Je invoer blijft lokaal bewaard.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  if (submitted) {
    const receipt = validateDraft(
      closingToDraft(submitted.closing, submitted.counts),
      false,
      defaultOpening,
    ).payload;
    return (
      <>
        <div className="notice success" role="status">
          Afslag definitief ingediend. Hij is nu vergrendeld voor vrije
          wijzigingen.
        </div>
        <div className="button-row no-print">
          <Link className="button primary" href={`/kassa-afslag/${id}`}>
            Afslag en historie bekijken →
          </Link>
          <Link className="button secondary" href="/kassa-afslag">
            Naar overzicht
          </Link>
        </div>
        <CashSheet
          payload={receipt}
          name={submitted.closing.employee_name}
          location={
            locations.find((l) => l.id === receipt.location_id)?.name ?? ""
          }
          status="Ingediend"
        />
      </>
    );
  }
  return (
    <>
      <div className="cash-save-bar no-print">
        <span
          role="status"
          aria-live="polite"
          className={`save-state ${saveState}`}
        >
          {saveState === "saving"
            ? "Bezig met opslaan…"
            : saveState === "failed"
              ? "Opslaan mislukt"
              : dirty
                ? "Niet opgeslagen"
                : version
                  ? "Opgeslagen"
                  : "Nieuw · nog niet opgeslagen"}
        </span>
        <span>{online ? "Online" : "Offline · invoer lokaal bewaard"}</span>
      </div>
      {recovery && !dirty ? (
        <div className="notice no-print">
          <strong>
            Er staat niet centraal opgeslagen invoer op dit apparaat.
          </strong>
          <p>
            Van {new Date(recovery.savedAt).toLocaleString("nl-NL")}. Kies eerst
            welke invoer je wilt gebruiken; er wordt niets stil overschreven.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => {
                setDraft(recovery.draft);
                setVersion(recovery.version);
                setSubmissionKey(recovery.submissionKey);
                setDirty(true);
                setSaveState("dirty");
                setRecovery(null);
              }}
            >
              Lokale invoer herstellen →
            </button>
            <button
              className="button subtle"
              onClick={() => {
                if (
                  window.confirm(
                    "Niet centraal opgeslagen lokale invoer verwijderen en de serverversie gebruiken?",
                  )
                ) {
                  removeLocalDraft(localStorage, userId, id);
                  setRecovery(null);
                }
              }}
            >
              Lokale invoer verwerpen
            </button>
          </div>
        </div>
      ) : null}
      {localError ? (
        <p className="notice error" role="alert">
          De lokale herstelkopie kon niet worden bewaard. Controleer via het
          overzicht of er nog een onzekere indiening openstaat. Laat dit scherm
          open tot centrale opslag bevestigd is.
        </p>
      ) : null}
      {submissionKey && !busy ? (
        <div className="notice">
          De uitkomst van de indiening is onzeker. De invoer is vastgezet om
          geen andere versie onder dezelfde indiening te versturen.
          <button className="button secondary" onClick={() => save(true)}>
            Indiening opnieuw controleren →
          </button>
        </div>
      ) : null}
      {message ? (
        <div
          className={`notice ${saveState === "saved" ? "success" : "error"}`}
          role={saveState === "saved" ? "status" : "alert"}
        >
          {message}
          {saveState === "failed" ? (
            <p>
              <Link
                href={`/kassa-afslag/${id}`}
                target="_blank"
                className="text-link"
              >
                Serverversie in een nieuw tabblad bekijken →
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
      {Object.keys(errors).length ? (
        <div className="notice error no-print" role="alert">
          <strong>Controleer de invoer</strong>
          <ul>
            {Object.entries(errors).map(([field, text]) => (
              <li key={field}>
                <a href={`#${field}`}>{text}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {review ? (
        <>
          <section className="panel review-bar no-print">
            <div>
              <strong>Controleer vóór definitief indienen</strong>
              <p>
                Na indienen kun je niet vrij wijzigen. Een bevoegde manager
                moet de afslag eerst heropenen.
              </p>
            </div>
            <div className="button-row">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => save(true)}
              >
                {busy ? "Bezig met indienen…" : "Ja, definitief indienen"} →
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setReview(false)}
              >
                Terug naar invoer
              </button>
            </div>
          </section>
          <CashSheet
            payload={checked.payload}
            name={employeeName}
            location={
              locations.find((l) => l.id === draft.locationId)?.name ?? ""
            }
            status="Nog niet ingediend"
          />
        </>
      ) : (
        <form
          className="cash-entry paper-cash-entry"
          onSubmit={(event) => {
            event.preventDefault();
            const result = validateDraft(draft, true, defaultOpening);
            const found = withEmployee(result.errors);
            setErrors(found);
            if (!Object.keys(found).length) {
              setReview(true);
              setMessage("");
            } else
              setMessage(
                "Controleer de gemarkeerde velden voordat je indient.",
              );
          }}
        >
          <fieldset
            className="panel cash-section cash-identity"
            disabled={blocked}
          >
            <legend>1 · Medewerker, vestiging en werkdatum</legend>
            <div className="employee-field">
              {shared ? (
                <>
                  <label htmlFor="employee">Wie maakt deze afslag?</label>
                  <select
                    id="employee"
                    value={draft.employeeId ?? ""}
                    disabled={lockedIdentity}
                    aria-invalid={Boolean(errors.employee)}
                    onChange={(event) => {
                      const value = event.target.value;
                      change((old) => ({ ...old, employeeId: value }));
                      setErrors((old) => {
                        const next = { ...old };
                        delete next.employee;
                        return next;
                      });
                    }}
                  >
                    <option value="">Kies je naam…</option>
                    {staffHere.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                  </select>
                  {error("employee")}
                  <p className="form-help">
                    Dit is de gedeelde kassacomputer. De afslag komt op jouw
                    naam.
                  </p>
                </>
              ) : (
                <>
                  <span className="field-label">Medewerker</span>
                  <p className="static-field">{name}</p>
                </>
              )}
            </div>
            <div className="cash-fields">
              <div>
                {locations.length === 1 ? (
                  <>
                    <span className="field-label">Vestiging</span>
                    <p className="static-field">{locations[0].name}</p>
                  </>
                ) : (
                  <>
                    <label htmlFor="location">Vestiging</label>
                    <select
                      id="location"
                      disabled={Boolean(initial) || lockedIdentity}
                      value={draft.locationId}
                      onChange={(event) =>
                        change((old) => ({
                          ...old,
                          ...(() => {
                            const form = forms.find(
                              (f) =>
                                f.id ===
                                locations.find(
                                  (l) => l.id === event.target.value,
                                )?.cash_form_id,
                            );
                            const fresh = emptyDraft(
                              event.target.value,
                              date,
                              form?.definition.opening ?? 15000,
                              form,
                            );
                            return {
                              formId: fresh.formId,
                              formDefinition: fresh.formDefinition,
                              customAmounts: fresh.customAmounts,
                            };
                          })(),
                          locationId: event.target.value,
                          employeeId: staff?.[event.target.value]?.some(
                            (s) => s.id === old.employeeId,
                          )
                            ? old.employeeId
                            : "",
                          opening: emptyDraft(
                            event.target.value,
                            date,
                            locations.find((l) => l.id === event.target.value)
                              ?.default_opening_cents ?? 15000,
                          ).opening,
                        }))
                      }
                    >
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                          {l.id === standardLocation ? " · standaard" : ""}
                        </option>
                      ))}
                    </select>
                    {!initial ? (
                      draft.locationId === standardLocation ? (
                        <p className="form-help default-location is-set">
                          ✓ Je standaardvestiging
                        </p>
                      ) : (
                        <button
                          type="button"
                          className="default-location"
                          disabled={savingDefault}
                          onClick={async () => {
                            const chosen = draft.locationId;
                            setSavingDefault(true);
                            const result = await setDefaultLocation(
                              chosen,
                            ).catch(() => ({
                              error:
                                "Standaardvestiging opslaan is niet gelukt.",
                            }));
                            setSavingDefault(false);
                            if (result.error) setMessage(result.error);
                            else setStandardLocation(chosen);
                          }}
                        >
                          {savingDefault
                            ? "Bezig…"
                            : "Maak dit mijn standaardvestiging"}
                        </button>
                      )
                    ) : null}
                  </>
                )}
                {error("location")}
              </div>
              <div>
                <label htmlFor="date">Werkdatum</label>
                <input
                  id="date"
                  type="date"
                  required
                  disabled={lockedIdentity}
                  value={draft.workDate}
                  onChange={(event) =>
                    change((old) => ({ ...old, workDate: event.target.value }))
                  }
                />
                {error("date")}
              </div>
            </div>
            <p className="form-help">
              De werkdatum staat los van het exacte indienmoment.
            </p>
          </fieldset>
          <div className="cash-entry-main">
          <div className="cash-form-columns">
            <div className="cash-count-column">
              <fieldset className="panel cash-section" disabled={blocked}>
                <legend>2 · Geld tellen</legend>
                <div className="count-intro">
                  <p className="form-help">
                    {countMode === "quantity"
                      ? "Vul per coupure het aantal stuks in."
                      : "Vul per coupure het getelde bedrag in, bijvoorbeeld 60 bij drie briefjes van € 20."}{" "}
                    Enter springt naar de volgende. Leeg betekent 0.
                  </p>
                  <div
                    className="count-mode"
                    role="radiogroup"
                    aria-label="Tellen in"
                  >
                    {(
                      [
                        ["quantity", "Aantal"],
                        ["amount", "Bedrag"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={countMode === mode}
                        onClick={() => switchMode(mode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="denomination-head" aria-hidden="true">
                  <span>Coupure</span>
                  <span>
                    {countMode === "quantity" ? "Aantal" : "Bedrag (€)"}
                  </span>
                  <span>
                    {countMode === "quantity" ? "Subtotaal" : "Stuks"}
                  </span>
                </div>
                <div className="denomination-grid">
                  {[
                    {
                      label: "Biljetten",
                      denominations: DENOMINATIONS.filter((d) => d >= 500),
                    },
                    {
                      label: "Munten",
                      denominations: DENOMINATIONS.filter((d) => d < 500),
                    },
                  ].map((group) => (
                    <div className="denomination-group" key={group.label}>
                      <h3>{group.label}</h3>
                      <div className="paper-count-head" aria-hidden="true">
                        <span>Waarde</span>
                        <span>{countMode === "quantity" ? "Aantal" : "Bedrag"}</span>
                        <span>{countMode === "quantity" ? "Bedrag" : "Aantal"}</span>
                      </div>
                      {group.denominations.map((d) => {
                        const index = DENOMINATIONS.indexOf(d);
                        const row = normalizeRow(d, draft.rows[d]);
                        const raw = draft.rows[d];
                        const shown =
                          raw.edited === countMode
                            ? raw[countMode]
                            : !row
                              ? raw[raw.edited]
                              : !row.quantity
                                ? ""
                                : countMode === "amount"
                                  ? inputMoney(row.quantity * d)
                                  : String(row.quantity);
                        return (
                          <div className="denomination-row" key={d}>
                            <label htmlFor={`count-${d}`}>{euro(d)}</label>
                            <div className="count-stepper">
                              <button
                                type="button"
                                tabIndex={-1}
                                aria-label={`Eén ${euro(d)} minder`}
                                disabled={!row?.quantity}
                                onClick={() => step(d, -1)}
                              >
                                −
                              </button>
                              <input
                                id={`count-${d}`}
                                inputMode={
                                  countMode === "quantity"
                                    ? "numeric"
                                    : "decimal"
                                }
                                autoComplete="off"
                                enterKeyHint={
                                  index < DENOMINATIONS.length - 1
                                    ? "next"
                                    : "done"
                                }
                                placeholder={
                                  countMode === "quantity" ? "0" : "0,00"
                                }
                                value={shown}
                                aria-invalid={Boolean(errors[`count-${d}`])}
                                aria-describedby={
                                  errors[`count-${d}`]
                                    ? `error-count-${d}`
                                    : undefined
                                }
                                onFocus={(event) => event.target.select()}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  setRow(d, () => ({
                                    quantity:
                                      countMode === "quantity" ? value : "",
                                    amount: countMode === "amount" ? value : "",
                                    edited: countMode,
                                  }));
                                }}
                                onBlur={() => normalize(d)}
                                onKeyDown={(event) => {
                                  if (event.key !== "Enter") return;
                                  event.preventDefault();
                                  const next = DENOMINATIONS[index + 1];
                                  document
                                    .getElementById(
                                      next ? `count-${next}` : "opening",
                                    )
                                    ?.focus();
                                }}
                              />
                              <button
                                type="button"
                                tabIndex={-1}
                                aria-label={`Eén ${euro(d)} meer`}
                                onClick={() => step(d, 1)}
                              >
                                +
                              </button>
                            </div>
                            <output
                              htmlFor={`count-${d}`}
                              className={row?.quantity ? "" : "is-empty"}
                            >
                              {!row
                                ? "?"
                                : countMode === "quantity"
                                  ? euro(row.quantity * d)
                                  : `${row.quantity} st.`}
                            </output>
                            {error(`count-${d}`)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="denomination-total">
                  <span>Totaal geteld</span>
                  <strong>{euro(checked.totals.counted)}</strong>
                </div>
                <div className="cash-fields opening-fields">
                  <div>
                    <label htmlFor="opening">Startsaldo (€)</label>
                    <input
                      id="opening"
                      inputMode="decimal"
                      value={draft.opening}
                      onChange={(event) =>
                        change((old) => ({
                          ...old,
                          opening: event.target.value,
                        }))
                      }
                    />
                    {error("opening")}
                    <p className="form-help">
                      Standaard voor deze vestiging: {euro(defaultOpening)}.
                    </p>
                  </div>
                  {openingDiffers ||
                  draft.openingReason ||
                  errors.openingReason ? (
                    <div>
                      <label htmlFor="openingReason">
                        Reden afwijkend startsaldo · verplicht
                      </label>
                      <textarea
                        id="openingReason"
                        value={draft.openingReason}
                        maxLength={4000}
                        onChange={(event) =>
                          change((old) => ({
                            ...old,
                            openingReason: event.target.value,
                          }))
                        }
                      />
                      {error("openingReason")}
                    </div>
                  ) : null}
                </div>
                <div className="paper-net-cash">
                  <span>Contant geld</span>
                  <output>
                    {checked.totals.cash < 0 ? "—" : euro(checked.totals.cash)}
                  </output>
                </div>
                {checked.totals.cash < 0 && checked.totals.counted > 0 ? (
                  <p className="notice">
                    Geteld geld ligt {euro(-checked.totals.cash)} onder het
                    startsaldo. Maak de telling af of controleer het startsaldo.
                    Zo kun je nog niet indienen.
                  </p>
                ) : null}
                {error("cash")}
              </fieldset>
            </div>
            <div className="cash-payment-column">
              <fieldset className="panel cash-section cash-turnover" disabled={blocked}>
                <legend>3 · Omzet</legend>
                <p className="form-help">
                  Vul de bedragen in volgens de formulierinstellingen van deze
                  vestiging.
                  {emptyAmounts ? (
                    <strong className="payment-progress">
                      {" "}
                      Nog {emptyAmounts}{" "}
                      {emptyAmounts === 1 ? "veld" : "velden"} leeg.
                    </strong>
                  ) : null}
                </p>
                <PaymentTable
                  definition={draft.formDefinition}
                  amounts={
                    draft.formDefinition
                      ? (draft.customAmounts ?? {})
                      : draft.amounts
                  }
                  values={
                    draft.formDefinition
                      ? customValues
                      : {
                          ...Object.fromEntries(
                            MONEY_FIELDS.map((field) => [
                              field.key,
                              checked.payload[field.key],
                            ]),
                          ),
                          counted: checked.totals.counted,
                          cash: checked.totals.cash,
                          required: checked.totals.required,
                          result: checked.totals.result,
                          register: checked.totals.register,
                        }
                  }
                  errors={errors}
                  calculations={false}
                  keys={turnoverKeys}
                  onChange={(key, value) => {
                    change((old) =>
                      old.formDefinition
                        ? {
                            ...old,
                            customAmounts: {
                              ...old.customAmounts,
                              [key]: value,
                            },
                          }
                        : { ...old, amounts: { ...old.amounts, [key]: value } },
                    );
                  }}
                />
              </fieldset>
              <fieldset className="panel cash-section cash-payments" disabled={blocked}>
                <legend>4 · Betaalwijzen</legend>
                <PaymentTable
                  definition={draft.formDefinition}
                  amounts={
                    draft.formDefinition
                      ? (draft.customAmounts ?? {})
                      : draft.amounts
                  }
                  values={
                    draft.formDefinition
                      ? customValues
                      : {
                          ...Object.fromEntries(
                            MONEY_FIELDS.map((field) => [
                              field.key,
                              checked.payload[field.key],
                            ]),
                          ),
                          counted: checked.totals.counted,
                          cash: checked.totals.cash,
                          required: checked.totals.required,
                          result: checked.totals.result,
                          register: checked.totals.register,
                        }
                  }
                  errors={errors}
                  calculations={false}
                  keys={paymentKeys}
                  onChange={(key, value) => {
                    change((old) =>
                      old.formDefinition
                        ? {
                            ...old,
                            customAmounts: {
                              ...old.customAmounts,
                              [key]: value,
                            },
                          }
                        : { ...old, amounts: { ...old.amounts, [key]: value } },
                    );
                  }}
                />
              </fieldset>
              <details
                className="panel cash-section cash-notes"
                open={
                  shortage ||
                  Boolean(draft.notes) ||
                  Boolean(draft.explanation) ||
                  Boolean(errors.explanation) ||
                  Boolean(errors.notes)
                }
              >
                <summary>
                  5 ·{" "}
                  {shortage || errors.explanation
                    ? "Toelichting en opmerkingen"
                    : "Opmerkingen"}
                </summary>
                <fieldset
                  disabled={blocked}
                  aria-label="Toelichting en opmerkingen"
                >
                  {shortage || errors.explanation || draft.explanation ? (
                    <>
                      <label htmlFor="explanation">
                        Toelichting tekort · verplicht
                      </label>
                      <textarea
                        id="explanation"
                        maxLength={4000}
                        value={draft.explanation}
                        onChange={(event) =>
                          change((old) => ({
                            ...old,
                            explanation: event.target.value,
                          }))
                        }
                      />
                      {error("explanation")}
                    </>
                  ) : null}
                  <label htmlFor="notes">
                    Algemene opmerkingen <span>· optioneel</span>
                  </label>
                  <textarea
                    id="notes"
                    maxLength={4000}
                    value={draft.notes}
                    onChange={(event) =>
                      change((old) => ({ ...old, notes: event.target.value }))
                    }
                  />
                  {error("notes")}
                </fieldset>
              </details>
            </div>
          </div>
          </div>
          <aside
            className="panel cash-overview"
            aria-label="Overzicht en berekening"
          >
            <header className="cash-overview-head">
              <h2>Overzicht</h2>
              <p>
                {[locationName, draft.workDate
                  ? new Date(`${draft.workDate}T12:00:00`).toLocaleDateString(
                      "nl-NL",
                      { weekday: "short", day: "numeric", month: "short" },
                    )
                  : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </header>
            <CashOverview
              definition={overviewDefinition}
              inputs={overviewInputs}
              totals={checked.totals}
            />
            <div className="cash-overview-actions no-print">
              <button
                type="submit"
                className="button primary"
                disabled={blocked}
              >
                Samenvatting en indienen →
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={blocked}
                onClick={() => save(false)}
              >
                Concept opslaan
              </button>
            </div>
          </aside>
          <div className="cash-dock no-print">
            <CashGlance totals={checked.totals} />
            <div className="cash-dock-actions">
              <button
                type="button"
                className="button secondary"
                disabled={blocked}
                onClick={() => save(false)}
              >
                Concept opslaan
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={blocked}
              >
                <span className="dock-label-long">
                  Samenvatting en indienen →
                </span>
                <span className="dock-label-short" aria-hidden="true">
                  Indienen →
                </span>
              </button>
            </div>
          </div>
        </form>
      )}
      {!review ? (
        <div className="print-only">
          <CashSheet
            payload={checked.payload}
            name={employeeName}
            location={
              locations.find((l) => l.id === draft.locationId)?.name ?? ""
            }
            status="Concept — niet ingediend"
          />
        </div>
      ) : null}
    </>
  );
}
