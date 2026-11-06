import { euro, type Totals } from "@/lib/cash/model";
import {
  evaluateDefinition,
  type FormDefinition,
} from "@/lib/cash/form-definition";
import { hiddenForNow } from "@/lib/cash/presentation";
import "./receipt.css";
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
        <dd>
          {result === null ? "—" : euro(Math.abs(result))}
        </dd>
      </div>
      <div className="register-line">
        <dt>In de kassa</dt>
        <dd>{totals.cash < 0 ? "—" : euro(totals.register)}</dd>
      </div>
    </dl>
  );
}
// One receipt: what is needed at the top, everything that covers it below with
// a minus, a line, and the outcome. The register amount follows on its own.
export function CashOverview({
  definition,
  inputs,
  totals,
  showRegister = true,
}: {
  definition: FormDefinition;
  inputs: Record<string, number | null>;
  totals: Totals;
  // The summary shows the register amount in its own tile instead.
  showRegister?: boolean;
}) {
  const { values } = evaluateDefinition(
    definition,
    inputs,
    totals.counted,
    totals.opening,
  );
  const fields = definition.fields;
  const labels: Record<string, string> = {
    counted: "Geteld",
    opening: "Startsaldo",
    ...Object.fromEntries(fields.map((f) => [f.key, f.label])),
  };
  const result = shownResult(totals);
  // Before counting, everything that builds on cash would be misleading.
  const waiting = !totals.counted || totals.cash < 0;
  const shown = (key: string) =>
    waiting && ["cash", "result", "register"].includes(key)
      ? null
      : (values[key] ?? null);
  const calculated = (key: string) =>
    fields.find((f) => f.key === key && f.kind === "calculated");
  const resultField = calculated("result");
  const register = calculated("register");
  // The first added calculated term of the result ("Totaal benodigd") is what
  // we need; its own terms go on top of the receipt.
  const [first, ...rest] = resultField?.terms ?? [];
  const need = first?.sign === 1 ? calculated(first.key) : undefined;
  const covered = need ? rest : (resultField?.terms ?? []);
  // A calculated line such as "Contant geld" shows how it came about.
  const explain = (key: string) => {
    const field = calculated(key);
    return field
      ? field.terms
          .map(
            (t, index) =>
              `${t.sign < 0 ? "− " : index ? "+ " : ""}${labels[t.key] ?? t.key} ${euro(shown(t.key))}`,
          )
          .join(" ")
      : null;
  };
  const line = (key: string, sign: string, index: number) =>
    hiddenForNow(key, values[key]) ? null : (
      <li key={`${key}-${index}`}>
        <span className="calc-sign" aria-hidden="true">
          {sign}
        </span>
        <span>
          {sign === "−" ? <span className="sr-only">min </span> : null}
          {labels[key] ?? key}
          {explain(key) ? <small>{explain(key)}</small> : null}
        </span>
        <span className="calc-value">{euro(shown(key))}</span>
      </li>
    );
  const tone = result === null ? "" : result > 0 ? "is-bad" : "is-good";
  return (
    <div className="cash-receipt">
      {need ? (
        <>
          <ol>
            {need.terms.map((t, index) =>
              line(t.key, t.sign < 0 ? "−" : index ? "+" : "", index),
            )}
          </ol>
          <div className="overview-total">
            <span>{need.label}</span>
            <strong>{euro(shown(need.key))}</strong>
          </div>
        </>
      ) : null}
      <ol>
        {covered.map((t, index) =>
          line(t.key, t.sign < 0 ? "−" : need || index ? "+" : "", index),
        )}
      </ol>
      <div className={`overview-result ${tone}`}>
        <span>
          {result === null
            ? (resultField?.label ?? "Resultaat")
            : result < 0
              ? "Fooi"
              : result > 0
                ? "Tekort"
                : "Sluitend"}
        </span>
        <strong>
          {result === null ? "—" : euro(Math.abs(result))}
        </strong>
      </div>
      {register && showRegister ? (
        <div className="overview-register">
          <span>{register.label}</span>
          <strong>{euro(shown(register.key))}</strong>
          <small>{explain(register.key)}</small>
        </div>
      ) : null}
    </div>
  );
}
