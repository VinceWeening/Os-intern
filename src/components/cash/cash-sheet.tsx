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
          <tr key={d}>
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
  const field = (key: (typeof MONEY_FIELDS)[number]["key"]) =>
    MONEY_FIELDS.find((f) => f.key === key)!;
  const payments = [
    "ideal_cents",
    "cash",
    "pax_cents",
    "paynl_cents",
    "shop_vouchers_cents",
    "redeemed_vouchers_cents",
  ] as const;
  return (
    <section className="cash-sheet panel">
      <div className="sheet-heading">
        <div>
          <span className="eyebrow">OS STEAKHOUSE</span>
          <h2>Kastellingformulier</h2>
        </div>
        <strong className="sheet-os">OS</strong>
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
          <dd>{payload.work_date}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{status}</dd>
        </div>
      </dl>
      <div className={`sheet-result ${resultTone(totals.result)}`}>
        <span>{resultLabel(totals.result)}</span>
        <strong>
          {totals.result === null ? "—" : euro(Math.abs(totals.result))}
        </strong>
        <small>
          In te vullen in de kassa: <b>{euro(totals.register)}</b>
        </small>
      </div>
      <table className="cash-table payment-sheet">
        <tbody>
          <tr>
            <th>{field("turnover_cents").label}</th>
            <td>{euro(payload.turnover_cents)}</td>
          </tr>
          <tr>
            <th>+ {field("sold_vouchers_cents").label}</th>
            <td>{euro(payload.sold_vouchers_cents)}</td>
          </tr>
          <tr className="total-row">
            <th>Totaal benodigd</th>
            <td>{euro(totals.required)}</td>
          </tr>
          {payments.map((key) =>
            key === "cash" ? (
              <tr key={key}>
                <th>− Contant geld</th>
                <td>{euro(totals.cash)}</td>
              </tr>
            ) : (
              <tr key={key}>
                <th>− {field(key).label}</th>
                <td>{euro(payload[key])}</td>
              </tr>
            ),
          )}
          <tr className={`total-row result-row ${resultTone(totals.result)}`}>
            <th>{resultLabel(totals.result)}</th>
            <td>
              {totals.result === null ? "—" : euro(Math.abs(totals.result))}
            </td>
          </tr>
          <tr className="total-row">
            <th>In te vullen in de kassa</th>
            <td>{euro(totals.register)}</td>
          </tr>
        </tbody>
      </table>
      <details className="sheet-counts no-print">
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
      <p className="form-help">
        In te vullen in de kassa = PAX + Pay.nl + contant geld + startsaldo.
      </p>
    </section>
  );
}
