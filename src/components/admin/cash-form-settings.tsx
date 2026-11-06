"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishCashForm } from "@/lib/cash/form-actions";
import {
  evaluateDefinition,
  OUTPUT_FIELDS,
  validateDefinition,
  type FormDefinition,
  type FormField,
  type FormVersion,
} from "@/lib/cash/form-definition";
import { euro, inputMoney, parseMoney } from "@/lib/cash/model";
import type { Location } from "@/lib/supabase/database.types";
import { ResultMessage } from "./result-message";
export function CashFormSettings({
  locations,
  forms,
}: {
  locations: Location[];
  forms: FormVersion[];
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const current = forms.find(
    (f) => f.id === locations.find((l) => l.id === locationId)?.cash_form_id,
  );
  const [message, setMessage] = useState("");
  return (
    <>
      <label>
        Vestiging
        <select
          value={locationId}
          onChange={(e) => {
            setLocationId(e.target.value);
            setMessage("");
          }}
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      {message ? (
        <p className="notice success" role="status">
          {message}
        </p>
      ) : null}
      {current ? (
        <DefinitionEditor
          key={current.id}
          current={current}
          onSaved={setMessage}
        />
      ) : (
        <p className="notice">Geen formulier beschikbaar.</p>
      )}
    </>
  );
}
function MoneySetting({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value === null ? "" : inputMoney(value));
  return (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={text}
        disabled={disabled}
        aria-invalid={!!text && parseMoney(text) === null}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value.trim() === ""
              ? null
              : (parseMoney(e.target.value) ?? -1),
          );
        }}
      />
    </label>
  );
}
function DefinitionEditor({
  current,
  onSaved,
}: {
  current: FormVersion;
  onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const [definition, setDefinition] = useState<FormDefinition>(
    current.definition,
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string }>(
    {},
  );
  const invalid = validateDefinition(definition);
  function update(index: number, change: Partial<FormField>) {
    setDefinition((old) => ({
      ...old,
      fields: old.fields.map((f, i) => (i === index ? { ...f, ...change } : f)),
    }));
  }
  function move(index: number, by: number) {
    setDefinition((old) => {
      const fields = [...old.fields];
      [fields[index], fields[index + by]] = [fields[index + by], fields[index]];
      return { ...old, fields };
    });
  }
  function add(kind: FormField["kind"]) {
    let n = definition.fields.length + 1;
    while (definition.fields.some((f) => f.key === `veld_${n}`)) n++;
    setDefinition((old) => ({
      ...old,
      fields: [
        ...old.fields,
        {
          key: `veld_${n}`,
          label: kind === "input" ? "Nieuw bedrag" : "Nieuwe tussenuitkomst",
          kind,
          required: true,
          minimum: kind === "input" ? 0 : null,
          default: kind === "input" ? 0 : null,
          terms: kind === "input" ? [] : [{ key: "counted", sign: 1 }],
        },
      ],
    }));
  }
  const exampleInputs = Object.fromEntries(
    definition.fields
      .filter((f) => f.kind === "input")
      .map((f) => [f.key, f.default ?? 0]),
  );
  const example = invalid
    ? null
    : evaluateDefinition(
        definition,
        exampleInputs,
        definition.opening + 10000,
        definition.opening,
      ).values;
  const fieldName = (key: string) =>
    key === "counted"
      ? "Totaal geteld"
      : key === "opening"
        ? "Startsaldo"
        : (definition.fields.find((field) => field.key === key)?.label ??
          "Ontbrekend veld");
  return (
    <form
      className="form-stack form-settings"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setResult({});
        try {
          const response = await publishCashForm({
            locationId: current.location_id,
            expectedId: current.id,
            definition,
            reason,
          });
          setResult(response);
          if (response.success) {
            onSaved(response.success);
            router.refresh();
          }
        } catch {
          setResult({
            error:
              "Publiceren is niet bevestigd. Vernieuw de gegevens voordat je opnieuw probeert.",
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="notice">
        Je bewerkt versie {current.version}. Publiceren maakt een nieuwe versie.
        De volgorde hieronder wordt ook de volgorde in het invulformulier.
        Alleen eerdere velden kunnen in een berekening worden gebruikt. Wisselen
        van vestiging verwerpt niet-gepubliceerde wijzigingen.
      </p>
      <fieldset disabled={busy} className="panel management-editor">
        <legend>Standaard startsaldo</legend>
        <MoneySetting
          label="Startsaldo (€)"
          value={definition.opening}
          onChange={(value) =>
            setDefinition((old) => ({ ...old, opening: value ?? -1 }))
          }
        />
      </fieldset>
      {definition.fields.map((field, index) => {
        const previous = [
          { key: "counted", label: "Totaal geteld" },
          { key: "opening", label: "Startsaldo" },
          ...definition.fields.slice(0, index),
        ];
        return (
          <fieldset
            className="panel management-editor form-stack"
            key={field.key}
            disabled={busy}
          >
            <legend>
              {index + 1} · {field.label}
            </legend>
            <div className="editor-grid">
              <label>
                Naam
                <input
                  required
                  maxLength={100}
                  value={field.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                />
              </label>
              <p className="form-help">
                {field.kind === "input"
                  ? "In te vullen bedrag"
                  : "Automatische berekening"}{" "}
                · {field.key}
              </p>
            </div>
            {field.kind === "input" ? (
              <>
                <div className="editor-grid">
                  <MoneySetting
                    label="Standaardbedrag (€), leeg = zelf invullen"
                    value={field.default}
                    onChange={(value) => update(index, { default: value })}
                  />
                  <MoneySetting
                    label="Minimum (€), leeg = geen extra minimum"
                    value={field.minimum}
                    onChange={(value) => update(index, { minimum: value })}
                  />
                </div>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      update(index, { required: e.target.checked })
                    }
                  />
                  Verplicht vóór indienen
                </label>
              </>
            ) : (
              <>
                <p className="form-help">
                  Deze uitkomst is de som van onderstaande plus- en minregels.
                </p>
                {field.terms.map((term, i) => (
                  <div className="formula-term" key={i}>
                    <label>
                      Bewerking
                      <select
                        value={term.sign}
                        onChange={(e) =>
                          update(index, {
                            terms: field.terms.map((t, j) =>
                              i === j
                                ? {
                                    ...t,
                                    sign: Number(e.target.value) as 1 | -1,
                                  }
                                : t,
                            ),
                          })
                        }
                      >
                        <option value={1}>+ Optellen</option>
                        <option value={-1}>− Aftrekken</option>
                      </select>
                    </label>
                    <label>
                      Veld
                      <select
                        value={term.key}
                        onChange={(e) =>
                          update(index, {
                            terms: field.terms.map((t, j) =>
                              i === j ? { ...t, key: e.target.value } : t,
                            ),
                          })
                        }
                      >
                        {!previous.some((f) => f.key === term.key) ? (
                          <option value={term.key}>
                            Ontbrekend of staat verderop: {term.key}
                          </option>
                        ) : null}
                        {previous.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="button subtle"
                      aria-label={`Term ${i + 1} uit ${field.label} verwijderen`}
                      onClick={() =>
                        update(index, {
                          terms: field.terms.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Verwijderen
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    update(index, {
                      terms: [
                        ...field.terms,
                        { key: previous[0].key, sign: 1 },
                      ],
                    })
                  }
                >
                  Rekenregel toevoegen
                </button>
                <MoneySetting
                  label="Minimum voor deze uitkomst (€), leeg = geen minimum"
                  value={field.minimum}
                  onChange={(value) => update(index, { minimum: value })}
                />
              </>
            )}
            <div className="button-row">
              <button
                type="button"
                className="button subtle"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑ Omhoog
              </button>
              <button
                type="button"
                className="button subtle"
                disabled={index === definition.fields.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓ Omlaag
              </button>
              {!OUTPUT_FIELDS.includes(field.key) ? (
                <button
                  type="button"
                  className="button subtle"
                  onClick={() =>
                    setDefinition((old) => ({
                      ...old,
                      fields: old.fields.filter((f) => f.key !== field.key),
                    }))
                  }
                >
                  Veld verwijderen
                </button>
              ) : (
                <small>
                  Vaste uitkomst; berekening en naam zijn aanpasbaar.
                </small>
              )}
            </div>
          </fieldset>
        );
      })}
      <div className="button-row">
        <button
          type="button"
          className="button secondary"
          disabled={busy || definition.fields.length >= 30}
          onClick={() => add("input")}
        >
          Bedrag toevoegen
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy || definition.fields.length >= 30}
          onClick={() => add("calculated")}
        >
          Tussenuitkomst toevoegen
        </button>
      </div>
      {invalid ? (
        <p className="notice" role="alert">
          {invalid}
        </p>
      ) : null}
      <section className="panel management-editor">
        <h2>Overzicht van de berekening</h2>
        <p>
          Fictieve telling: startsaldo + € 100. Invoervelden gebruiken hun
          standaardbedrag (leeg wordt hier 0). Dit voorbeeld wordt niet als
          afslag opgeslagen.
        </p>
        <table className="form-calculation-table">
          <caption>Invoer en rekenregels van deze formulierversie</caption>
          <thead>
            <tr>
              <th scope="col">Onderdeel</th>
              <th scope="col">Berekening</th>
              <th scope="col">Voorbeeld</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Totaal geteld</th>
              <td>Fictieve geldtelling</td>
              <td>{euro(definition.opening + 10000)}</td>
            </tr>
            <tr>
              <th scope="row">Startsaldo</th>
              <td>Ingesteld standaardbedrag</td>
              <td>{euro(definition.opening)}</td>
            </tr>
            {definition.fields.map((field) => (
              <tr
                key={field.key}
                className={field.kind === "calculated" ? "calculated-row" : ""}
              >
                <th scope="row">{field.label}</th>
                <td>
                  {field.kind === "input" ? (
                    <>
                      Invoer medewerker
                      <small>
                        {field.required ? "Verplicht" : "Optioneel"}
                        {field.minimum !== null
                          ? ` · minimum ${euro(field.minimum)}`
                          : ""}
                        {field.default === null
                          ? " · geen standaardbedrag"
                          : ` · standaard ${euro(field.default)}`}
                      </small>
                    </>
                  ) : (
                    field.terms
                      .map(
                        (term, index) =>
                          `${term.sign === -1 ? "− " : index === 0 ? "" : "+ "}${fieldName(term.key)}`,
                      )
                      .join(" ") || "Nog geen rekenregels"
                  )}
                </td>
                <td>{euro(example?.[field.key] ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <label>
        Reden nieuwe versie
        <input
          required
          minLength={3}
          maxLength={500}
          value={reason}
          disabled={busy}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <ResultMessage result={result} />
      <button className="button primary" disabled={busy || !!invalid}>
        {busy ? "Bezig met publiceren…" : "Nieuwe versie publiceren"}
      </button>
    </form>
  );
}
