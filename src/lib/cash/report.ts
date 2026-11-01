import { inputMoney } from "./model";
import type { ReportRow } from "@/lib/supabase/database.types";

export type ReportTotals = {
  closings: number;
  turnover: number;
  ideal: number;
  cash: number;
  pax: number;
  paynl: number;
  vouchers: number;
  tips: number;
  shortages: number;
  register: number;
};

// "2026-11" → first and last day of that month, or null when invalid.
export function monthRange(month: string): { from: string; to: string } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const last = new Date(Date.UTC(year, Number(match[2]), 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, "0")}`,
  };
}

// A negative result is a tip, a positive result a shortage.
export function tipOf(row: ReportRow) {
  return row.result_cents < 0 ? -row.result_cents : 0;
}
export function shortageOf(row: ReportRow) {
  return row.result_cents > 0 ? row.result_cents : 0;
}

export function summarize(rows: ReportRow[]): ReportTotals {
  return rows.reduce<ReportTotals>(
    (sum, row) => ({
      closings: sum.closings + 1,
      turnover: sum.turnover + row.turnover_cents,
      ideal: sum.ideal + row.ideal_cents,
      cash: sum.cash + row.cash_cents,
      pax: sum.pax + row.pax_cents,
      paynl: sum.paynl + row.paynl_cents,
      vouchers:
        sum.vouchers + row.shop_vouchers_cents + row.redeemed_vouchers_cents,
      tips: sum.tips + tipOf(row),
      shortages: sum.shortages + shortageOf(row),
      register: sum.register + row.register_cents,
    }),
    {
      closings: 0,
      turnover: 0,
      ideal: 0,
      cash: 0,
      pax: 0,
      paynl: 0,
      vouchers: 0,
      tips: 0,
      shortages: 0,
      register: 0,
    },
  );
}

export function byLocation(rows: ReportRow[]) {
  const groups = new Map<string, { name: string; rows: ReportRow[] }>();
  for (const row of rows) {
    const group = groups.get(row.location_id) ?? {
      name: row.location_name,
      rows: [],
    };
    group.rows.push(row);
    groups.set(row.location_id, group);
  }
  return [...groups.entries()]
    .map(([id, group]) => ({
      id,
      name: group.name,
      totals: summarize(group.rows),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

// Semicolons and decimal commas open correctly in Dutch Excel. Text that
// starts like a formula is prefixed so a spreadsheet never executes it.
function cell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
export function toCsv(rows: ReportRow[]) {
  const header = [
    "Werkdatum",
    "Vestiging",
    "Medewerker",
    "Status",
    "Omzet",
    "Verkochte cadeaubonnen",
    "iDEAL",
    "Contant",
    "PAX",
    "Pay.nl",
    "Winkelbonnen",
    "Verzilverde cadeaubonnen",
    "Fooi",
    "Tekort",
    "In de kassa",
  ];
  const lines = rows.map((row) =>
    [
      row.work_date,
      row.location_name,
      row.employee_name,
      row.status === "reviewed" ? "Gecontroleerd" : "Ingediend",
      ...[
        row.turnover_cents,
        row.sold_vouchers_cents,
        row.ideal_cents,
        row.cash_cents,
        row.pax_cents,
        row.paynl_cents,
        row.shop_vouchers_cents,
        row.redeemed_vouchers_cents,
        tipOf(row),
        shortageOf(row),
        row.register_cents,
      ].map(inputMoney),
    ]
      .map(cell)
      .join(";"),
  );
  return `﻿${[header.join(";"), ...lines].join("\r\n")}\r\n`;
}
