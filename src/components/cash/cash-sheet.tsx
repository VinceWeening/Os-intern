import {
  DENOMINATIONS,
  MONEY_FIELDS,
  calculate,
  euro,
  type CashPayload,
} from "@/lib/cash/model";
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
            <td>{euro(totals.opening)}</td>
          </tr>
          <tr className="total-row">
            <th colSpan={2}>Contant geld</th>
            <td>{euro(totals.cash)}</td>
          </tr>
        </tbody>
      </table>
      <table className="cash-table payment-sheet">
        <tbody>
          {MONEY_FIELDS.map((field) => (
            <tr key={field.key}>
              <th>{field.label}</th>
              <td>{euro(payload[field.key])}</td>
            </tr>
          ))}
          <tr className="total-row">
            <th>Totaal benodigd</th>
            <td>{euro(totals.required)}</td>
          </tr>
          <tr>
            <th>Contant geld</th>
            <td>{euro(totals.cash)}</td>
          </tr>
          <tr className="total-row">
            <th>
              Resultaat{" "}
              {totals.result !== null && totals.result < 0
                ? "· fooi"
                : totals.result !== null && totals.result > 0
                  ? "· tekort"
                  : ""}
            </th>
            <td>{euro(totals.result)}</td>
          </tr>
          <tr className="total-row">
            <th>In te vullen in de kassa</th>
            <td>{euro(totals.register)}</td>
          </tr>
        </tbody>
      </table>
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
        Negatief resultaat = berekende fooi. Positief resultaat = tekort. In te
        vullen = PAX + Pay.nl + contant geld + startsaldo.
      </p>
    </section>
  );
}
