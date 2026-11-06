"use client";
import type { FormDefinition } from "@/lib/cash/form-definition";
import {
  paperFields,
  paperSign,
  formulaLabel,
  hiddenForNow,
} from "@/lib/cash/presentation";
import { euro, inputMoney, parseMoney } from "@/lib/cash/model";

export function PaymentTable({
  definition,
  amounts,
  values,
  errors,
  onChange,
  calculations = true,
  keys,
}: {
  definition?: FormDefinition;
  amounts: Record<string, string>;
  values: Record<string, number | null>;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
  // Without calculations only the input rows show; the overview does the sums.
  calculations?: boolean;
  // Limit the table to these fields, e.g. only turnover or only payments.
  keys?: string[];
}) {
  const fields = paperFields(definition);
  const rows = (
    calculations ? fields : fields.filter((field) => field.kind === "input")
  )
    .filter((field) => !keys || keys.includes(field.key))
    .filter(
      (field) => !hiddenForNow(field.key, parseMoney(amounts[field.key] ?? "")),
    );
  return (
    <table className="paper-money-table">
      <caption>Omzet, betaalwijzen en automatische berekening</caption>
      <thead>
        <tr>
          <th scope="col">Omschrijving</th>
          <th scope="col">Bedrag</th>
          {calculations ? (
            <th scope="col">
              <span className="paper-sr-only">Bewerking</span>
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((field) => {
          const input = field.kind === "input";
          const id = definition ? `custom-${field.key}` : field.key;
          const waitingForCash =
            (values.counted ?? 0) === 0 || (values.cash ?? -1) < 0;
          const value =
            waitingForCash && ["cash", "result", "register"].includes(field.key)
              ? null
              : (values[field.key] ?? null);
          const computedClass = !input
            ? `paper-calculated paper-${field.key}`
            : "";
          const tone =
            field.key === "result" && value !== null
              ? value > 0
                ? "paper-shortage"
                : "paper-balanced"
              : "";
          const label = field.label;
          return (
            <tr key={field.key} className={`${computedClass} ${tone}`}>
              <th scope="row">
                {input ? (
                  <label htmlFor={id}>
                    {label}
                    {field.required ? (
                      <span
                        className="paper-required-mark"
                        aria-label="verplicht"
                      >
                        {" "}
                        *
                      </span>
                    ) : (
                      <small>Optioneel</small>
                    )}
                  </label>
                ) : (
                  <span>{label}</span>
                )}
                {field.key === "required" || field.key === "register" ? (
                  <small>{formulaLabel(field, fields)}</small>
                ) : field.key === "result" ? (
                  <small>Min = fooi · plus = tekort</small>
                ) : null}
                {field.minimum !== null && field.minimum > 0 ? (
                  <small>Minimum {euro(field.minimum)}</small>
                ) : null}
                {errors[field.key] ? (
                  <small className="field-error" id={`error-${field.key}`}>
                    {errors[field.key]}
                  </small>
                ) : null}
              </th>
              <td>
                {input ? (
                  <div className="paper-money-input">
                    <span aria-hidden="true">€</span>
                    <input
                      id={id}
                      aria-label={`${label} in euro${field.required ? ", verplicht" : ""}`}
                      aria-required={field.required}
                      inputMode="decimal"
                      autoComplete="off"
                      value={amounts[field.key] ?? ""}
                      placeholder="0,00"
                      aria-invalid={Boolean(errors[field.key])}
                      aria-describedby={
                        errors[field.key] ? `error-${field.key}` : undefined
                      }
                      onFocus={(event) => event.target.select()}
                      onChange={(event) =>
                        onChange(field.key, event.target.value)
                      }
                      onBlur={() => {
                        const raw = amounts[field.key] ?? "";
                        const cents = parseMoney(raw);
                        if (cents !== null && raw !== inputMoney(cents))
                          onChange(field.key, inputMoney(cents));
                      }}
                    />
                  </div>
                ) : (
                  <output className="paper-money-output" aria-label={label}>
                    {euro(value)}
                  </output>
                )}
              </td>
              {calculations ? (
                <td
                  className="paper-sign"
                  aria-label={
                    paperSign(field, fields) === "+"
                      ? "optellen"
                      : paperSign(field, fields) === "−"
                        ? "aftrekken"
                        : undefined
                  }
                >
                  {paperSign(field, fields)}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
