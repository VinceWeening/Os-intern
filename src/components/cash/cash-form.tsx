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
  readLocalDraft,
  localKey,
  type LocalDraft,
} from "@/lib/cash/local-draft";
import { saveCash, setDefaultLocation } from "@/lib/cash/actions";
import type { CashSnapshot, Location } from "@/lib/supabase/database.types";
import { CashGlance, CashTotals } from "./totals";
import { CashSheet } from "./cash-sheet";

type CountMode = CountRow["edited"];
const COUNT_MODE_KEY = "os-werkplek:tellen-in";
// "cash" is geen invulveld: contant geld volgt uit de telling.
const PAYMENT_GROUPS = [
  { title: "Omzet", keys: ["turnover_cents", "sold_vouchers_cents"] },
  {
    title: "Betaald via",
    keys: [
      "ideal_cents",
      "cash",
      "pax_cents",
      "paynl_cents",
      "shop_vouchers_cents",
      "redeemed_vouchers_cents",
    ],
  },
] as const;
type Props = {
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
  const emptyAmounts = MONEY_FIELDS.filter(
    (field) => draft.amounts[field.key].trim() === "",
  ).length;
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
      localStorage.setItem(key, JSON.stringify(item));
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
      setRecovery(readLocalDraft(localStorage.getItem(key), userId, id));
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
        localStorage.removeItem(key);
      } catch {
        /* No server data is lost. */
      }
      if (final) {
        setSubmitted(result.snapshot);
        setReview(false);
        router.push("/kassa-afslag?melding=ingediend");
      } else {
        setMessage("Concept centraal opgeslagen.");
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
                  localStorage.removeItem(key);
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
          Deze browser kan invoer niet lokaal bewaren. Laat het scherm open tot
          centrale opslag bevestigd is.
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
          <section className="notice no-print">
            <strong>Controleer vóór definitief indienen</strong>
            <p>
              Na indienen kun je niet vrij wijzigen. Een bevoegde manager moet
              de afslag eerst heropenen.
            </p>
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
          className="cash-entry"
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
          <fieldset className="panel cash-section" disabled={blocked}>
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
          <div className="cash-form-columns">
            <div>
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
                {DENOMINATIONS.map((d, index) => {
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
                            countMode === "quantity" ? "numeric" : "decimal"
                          }
                          autoComplete="off"
                          enterKeyHint={
                            index < DENOMINATIONS.length - 1 ? "next" : "done"
                          }
                          placeholder={countMode === "quantity" ? "0" : "0,00"}
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
                              quantity: countMode === "quantity" ? value : "",
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
                {checked.totals.cash < 0 && checked.totals.counted > 0 ? (
                  <p className="notice">
                    Geteld geld ligt {euro(-checked.totals.cash)} onder het
                    startsaldo. Maak de telling af of controleer het startsaldo.
                    Zo kun je nog niet indienen.
                  </p>
                ) : null}
                {error("cash")}
              </fieldset>
              <fieldset className="panel cash-section" disabled={blocked}>
                <legend>3 · Omzet en betaalwijzen</legend>
                <p className="form-help">
                  Alles staat standaard op € 0,00. Vul alleen in wat vanavond is
                  gebruikt.
                  {emptyAmounts ? (
                    <strong className="payment-progress">
                      {" "}
                      Nog {emptyAmounts}{" "}
                      {emptyAmounts === 1 ? "veld" : "velden"} leeg.
                    </strong>
                  ) : null}
                </p>
                {PAYMENT_GROUPS.map((group) => (
                  <div className="payment-group" key={group.title}>
                    <h3>{group.title}</h3>
                    {group.keys.map((key) => {
                      if (key === "cash")
                        return (
                          <div className="payment-input" key={key}>
                            <span className="payment-label">
                              Contant geld <span>· uit je telling</span>
                            </span>
                            <output className="payment-computed">
                              {checked.totals.cash >= 0
                                ? euro(checked.totals.cash)
                                : "—"}
                            </output>
                          </div>
                        );
                      const field = MONEY_FIELDS.find((f) => f.key === key)!;
                      const value = draft.amounts[key];
                      return (
                        <div
                          className={`payment-input${parseMoney(value) === 0 ? " is-zero" : ""}`}
                          key={key}
                        >
                          <label htmlFor={key}>{field.label} (€)</label>
                          <input
                            id={key}
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0,00"
                            value={value}
                            aria-invalid={Boolean(errors[key])}
                            onFocus={(event) => event.target.select()}
                            onChange={(event) =>
                              change((old) => ({
                                ...old,
                                amounts: {
                                  ...old.amounts,
                                  [key]: event.target.value,
                                },
                              }))
                            }
                            onBlur={() => {
                              const cents = parseMoney(value);
                              if (cents !== null && value !== inputMoney(cents))
                                change((old) => ({
                                  ...old,
                                  amounts: {
                                    ...old.amounts,
                                    [key]: inputMoney(cents),
                                  },
                                }));
                            }}
                          />
                          {error(key)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </fieldset>
              <fieldset className="panel cash-section" disabled={blocked}>
                <legend>
                  4 · {shortage ? "Toelichting en opmerkingen" : "Opmerkingen"}
                </legend>
                {shortage ? (
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
              </fieldset>
            </div>
            <aside className="panel cash-summary">
              <h2>Jouw telling</h2>
              <CashTotals totals={checked.totals} />
              <p className="form-help">
                Totaal benodigd = omzet + verkochte cadeaubonnen. Resultaat =
                benodigd − alle betaalwijzen − contant geld.
              </p>
            </aside>
          </div>
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
