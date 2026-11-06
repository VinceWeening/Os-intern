import type { FormDefinition } from "@/lib/cash/form-definition";
import defaultForm from "@/lib/cash/default-form.json";
import { formulaLabel } from "@/lib/cash/presentation";
import { BrandLogo } from "@/components/brand";
import { CashOverview } from "./totals";
import "./cash-sheet.css";
import {
  DENOMINATIONS,
  MONEY_FIELDS,
  calculate,
  euro,
  type CashPayload,
  type Totals,
} from "@/lib/cash/model";

// Green for a tip or a closing balance, orange only for a shortage.
export function resultTone(result: number | null) {
  return result === null ? "" : result > 0 ? "is-bad" : "is-good";
}
function resultLabel(result: number | null) {
  return result === null
    ? "Resultaat"
    : result < 0
      ? "Fooi"
      : result > 0
        ? "Tekort"
        : "Sluitend";
}
function CountsTable({
  payload,
  totals,
}: {
  payload: CashPayload;
  totals: Totals;
}) {
  return (
    <table className="cash-table">
      <thead>
        <tr>
          <th>Coupure</th>
          <th>Aantal</th>
          <th>Bedrag</th>
        </tr>
      </thead>
      <tbody>
        {DENOMINATIONS.map((d) => (
          <tr key={d} className={payload.counts[d] ? "" : "is-zero"}>
            <td>{euro(d)}</td>
            <td>{payload.counts[d] ?? 0}</td>
            <td>{euro(d * (payload.counts[d] ?? 0))}</td>
          </tr>
        ))}
        <tr className="total-row">
          <th colSpan={2}>Totaal geteld</th>
          <td>{euro(totals.counted)}</td>
        </tr>
        <tr>
          <th colSpan={2}>Startsaldo</th>
          <td>− {euro(totals.opening)}</td>
        </tr>
        <tr className="total-row">
          <th colSpan={2}>Contant geld</th>
          <td>{euro(totals.cash)}</td>
        </tr>
      </tbody>
    </table>
  );
}
export function CashSheet({
  payload,
  name,
  location,
  status,
}: {
  payload: CashPayload;
  name: string;
  location: string;
  status: string;
}) {
  const totals = calculate(payload);
  // Drafts from before configurable forms follow the standard calculation.
  const definition = payload.form_schema ?? (defaultForm as FormDefinition);
  const inputs = payload.form_schema
    ? (payload.custom_inputs ?? {})
    : Object.fromEntries(MONEY_FIELDS.map((f) => [f.key, payload[f.key]]));
  const register = definition.fields.find((f) => f.key === "register");
  return (
    <section className="cash-sheet panel">
      <div className="sheet-heading">
        <div>
          <span className="eyebrow">OS STEAKHOUSE</span>
          <h2>Kastellingformulier</h2>
        </div>
        <span className="sheet-os">
          <BrandLogo />
        </span>
      </div>
      <dl className="sheet-meta">
        <div>
          <dt>Naam</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt>Vestiging</dt>
          <dd>{location}</dd>
        </div>
        <div>
          <dt>Werkdatum</dt>
          <dd>
            {new Date(`${payload.work_date}T12:00:00`).toLocaleDateString(
              "nl-NL",
              { weekday: "short", day: "numeric", month: "long", year: "numeric" },
            )}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{status}</dd>
        </div>
      </dl>
      <div className="sheet-tiles">
        <div className={`sheet-result ${resultTone(totals.result)}`}>
          <span>{resultLabel(totals.result)}</span>
          <strong>
            {totals.result === null ? "—" : euro(Math.abs(totals.result))}
          </strong>
          <small>
            {totals.result === null
              ? "Nog niet alle bedragen zijn ingevuld."
              : totals.result > 0
                ? "Er is minder geld dan de omzet vraagt."
                : totals.result < 0
                  ? "Er is meer geld dan de omzet vraagt."
                  : "Geld en omzet sluiten precies."}
          </small>
        </div>
        <div className="sheet-register">
          <span>In te vullen in de kassa</span>
          <strong>{euro(totals.register)}</strong>
          {register ? (
            <small>{formulaLabel(register, definition.fields)}</small>
          ) : null}
        </div>
      </div>
      <div className="sheet-body">
        <div className="sheet-calc">
          <h3>Berekening</h3>
          <CashOverview
            definition={definition}
            inputs={inputs}
            totals={totals}
            showRegister={false}
          />
        </div>
        <div className="sheet-side">
          <details className="sheet-counts no-print" open>
            <summary>
              <span>Geteld geld per coupure</span>
              <strong>{euro(totals.counted)}</strong>
            </summary>
            <CountsTable payload={payload} totals={totals} />
          </details>
          <div className="print-only sheet-counts-print">
            <CountsTable payload={payload} totals={totals} />
          </div>
          {payload.opening_reason ? (
            <div className="sheet-notes">
              <h3>Reden afwijkend startsaldo</h3>
              <p>{payload.opening_reason}</p>
            </div>
          ) : null}
          {payload.difference_explanation &&
          totals.result !== null &&
          totals.result > 0 ? (
            <div className="sheet-notes">
              <h3>Toelichting tekort</h3>
              <p>{payload.difference_explanation}</p>
            </div>
          ) : null}
          <div className="sheet-notes">
            <h3>Opmerkingen</h3>
            <p>{payload.notes || "Geen opmerkingen."}</p>
          </div>
        </div>
      </div>
      <p className="form-help">
        {payload.form_schema
          ? "Bedragen berekend met de bij deze telling opgeslagen formulierinstellingen."
          : "In te vullen in de kassa = PAX + Pay.nl + contant geld + startsaldo."}
      </p>
    </section>
  );
}
