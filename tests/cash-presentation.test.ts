import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import defaultForm from "@/lib/cash/default-form.json";
import type { FormDefinition } from "@/lib/cash/form-definition";
import { paperFields, paperSign, formulaLabel } from "@/lib/cash/presentation";
import { PaymentTable } from "@/components/cash/payment-table";
const definition = defaultForm as FormDefinition;
describe("paper form presentation", () => {
 it("shows every standard field once, with required before the deductions", () => {
  const original=definition.fields.map(f=>f.key);
  const shown=paperFields(definition);
  expect(shown.map(f=>f.key)).toEqual(["turnover_cents","sold_vouchers_cents","required","ideal_cents","shop_vouchers_cents","redeemed_vouchers_cents","pax_cents","paynl_cents","cash","result","register"]);
  expect(definition.fields.map(f=>f.key)).toEqual(original);
 });
 it("preserves a deliberately customized field order and labels", () => {
  const custom=structuredClone(definition);[custom.fields[0],custom.fields[1]]=[custom.fields[1],custom.fields[0]];custom.fields[0].label="Eigen naam";
  expect(paperFields(custom)).toEqual(custom.fields);
 });
 it("takes printed signs and formula labels from the configured calculation", () => {
  const custom=structuredClone(definition);const result=custom.fields.find(f=>f.key==="result")!;result.terms.find(t=>t.key==="pax_cents")!.sign=1;
  expect(paperSign(custom.fields.find(f=>f.key==="pax_cents")!,custom.fields)).toBe("+");
  expect(formulaLabel(custom.fields.find(f=>f.key==="register")!,custom.fields)).toBe("PAX dagafsluiting + Pay.nl + Contant geld + Startsaldo");
 });
 it("does not show a cash shortage before money has been counted", () => {
  const html=renderToStaticMarkup(createElement(PaymentTable,{definition,amounts:{},values:{counted:0,cash:-15000,required:0,result:15000,register:0},errors:{},onChange:()=>{}}));
  expect(html).not.toContain('class="paper-calculated paper-result paper-shortage"');
  expect(html).toContain('aria-label="Resultaat">—</output>');
 });
 it("keeps the signed result when counting is valid", () => {
  const html=renderToStaticMarkup(createElement(PaymentTable,{definition,amounts:{},values:{counted:20000,cash:5000,required:10000,result:-500,register:23500},errors:{},onChange:()=>{}}));
  expect(html).toContain('aria-label="Resultaat">€ -5,00</output>');expect(html).toContain('aria-label="In te vullen in de kassa">€ 235,00</output>');
 });
});
