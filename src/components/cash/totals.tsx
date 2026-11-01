import { euro, type Totals } from "@/lib/cash/model";
// Zonder telling zegt het resultaat nog niets.
function shownResult(totals: Totals) {
  return totals.counted ? totals.result : null;
}
export function CashGlance({ totals }: { totals: Totals }) {
  const result = shownResult(totals);
  return (
    <dl className="cash-glance">
      <div>
        <dt>Geteld</dt>
        <dd>{totals.counted ? euro(totals.counted) : "—"}</dd>
      </div>
      <div
        className={
          result !== null && result > 0
            ? "has-shortage"
            : result !== null
              ? "result-line"
              : ""
        }
      >
        <dt>
          {result === null
            ? "Resultaat"
            : result < 0
              ? "Fooi"
              : result > 0
                ? "Tekort"
                : "Sluitend"}
        </dt>
        <dd>{result === null ? "—" : euro(Math.abs(result))}</dd>
      </div>
      <div className="register-line">
        <dt>In de kassa</dt>
        <dd>{totals.cash < 0 ? "—" : euro(totals.register)}</dd>
      </div>
    </dl>
  );
}
export function CashTotals({ totals }: { totals: Totals }) {
  const result = shownResult(totals);
  return (
    <div className="cash-totals">
      <div>
        <span>Totaal geteld</span>
        <strong>{euro(totals.counted)}</strong>
      </div>
      <div>
        <span>Startsaldo</span>
        <strong>{euro(totals.opening)}</strong>
      </div>
      <div>
        <span>Contant geld</span>
        <strong>
          {totals.cash >= 0
            ? euro(totals.cash)
            : totals.counted
              ? "Telling controleren"
              : "—"}
        </strong>
      </div>
      <div>
        <span>Totaal benodigd</span>
        <strong>{euro(totals.required)}</strong>
      </div>
      <div
        className={result !== null && result > 0 ? "has-shortage" : "result-line"}
      >
        <span>
          {result === null
            ? "Resultaat"
            : result < 0
              ? "Berekende fooi"
              : result > 0
                ? "Tekort"
                : "Resultaat · sluitend"}
        </span>
        <strong>
          {result !== null && result < 0 ? euro(-result) : euro(result)}
        </strong>
        {result !== null && result < 0 ? (
          <small>Resultaat: {euro(result)}</small>
        ) : null}
      </div>
      <div className="register-line">
        <span>In te vullen in de kassa</span>
        <strong>{totals.cash < 0 ? "—" : euro(totals.register)}</strong>
        <small>PAX + Pay.nl + contant geld + startsaldo</small>
      </div>
    </div>
  );
}
