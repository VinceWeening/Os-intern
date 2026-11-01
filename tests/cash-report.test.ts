import { describe, expect, it } from 'vitest';
import { byLocation, monthRange, summarize, toCsv } from '@/lib/cash/report';
import type { ReportRow } from '@/lib/supabase/database.types';

function row(changes: Partial<ReportRow>): ReportRow {
  return {
    id: '30000000-0000-0000-0000-000000000001', location_id: 'heiloo', location_name: 'Heiloo',
    work_date: '2026-11-01', employee_name: 'Testmedewerker A', status: 'submitted',
    turnover_cents: 100000, sold_vouchers_cents: 0, ideal_cents: 5000, pax_cents: 60000, paynl_cents: 10000,
    shop_vouchers_cents: 0, redeemed_vouchers_cents: 0, counted_cents: 40000, opening_cents: 15000,
    cash_cents: 25000, result_cents: 0, register_cents: 110000, ...changes,
  };
}

describe('cash report', () => {
  it('turns a month into its first and last day, also in February of a leap year', () => {
    expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthRange('2026-13')).toBeNull();
    expect(monthRange('november')).toBeNull();
  });
  it('separates tips from shortages instead of netting them', () => {
    const totals = summarize([row({ result_cents: -2500 }), row({ result_cents: 1000 }), row({ result_cents: -500 })]);
    expect(totals).toMatchObject({ closings: 3, tips: 3000, shortages: 1000, turnover: 300000 });
  });
  it('groups totals per location in alphabetical order', () => {
    const groups = byLocation([
      row({ location_id: 'hhw', location_name: 'Heerhugowaard', result_cents: -700 }),
      row({ result_cents: -300 }),
      row({ result_cents: -200 }),
    ]);
    expect(groups.map(g => [g.name, g.totals.closings, g.totals.tips])).toEqual([['Heerhugowaard', 1, 700], ['Heiloo', 2, 500]]);
  });
  it('exports Dutch Excel CSV and neutralises formula-like names', () => {
    const csv = toCsv([row({ employee_name: '=HYPERLINK("x")', result_cents: -1234 })]);
    expect(csv.startsWith('﻿Werkdatum;Vestiging')).toBe(true);
    const line = csv.split('\r\n')[1];
    expect(line).toContain(`"'=HYPERLINK(""x"")"`);
    expect(line).toContain(';1000,00;');
    expect(line).toContain(';12,34;0,00;1100,00');
  });
});
