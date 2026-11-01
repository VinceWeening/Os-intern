import { describe, expect, it } from 'vitest';
import { calculate, emptyDraft, normalizeRow, parseMoney, validateDraft, DENOMINATIONS, type CashPayload } from '@/lib/cash/model';

const loc='10000000-0000-0000-0000-000000000001';
export const fixture: CashPayload = {
  location_id:loc,work_date:'2026-11-01',counts:{10000:1,5000:2},opening_cents:15000,opening_reason:'',
  turnover_cents:10000,sold_vouchers_cents:0,ideal_cents:1000,shop_vouchers_cents:500,redeemed_vouchers_cents:500,pax_cents:2500,paynl_cents:1000,
  difference_explanation:'',notes:'Fictieve test',
};
describe('approved OS cash calculations',()=>{
  it('calculates counted, cash, tips and register total exactly in cents',()=>{
    expect(calculate(fixture)).toEqual({counted:20000,opening:15000,cash:5000,required:10000,result:-500,register:23500});
  });
  it('adds sold vouchers only to required, redeemed vouchers only to payment sources',()=>{
    expect(calculate({...fixture,sold_vouchers_cents:2000,redeemed_vouchers_cents:1000}).result).toBe(1000);
  });
  it('uses the actual daily opening amount',()=>{
    const total=calculate({...fixture,opening_cents:17500});
    expect(total.cash).toBe(2500);expect(total.result).toBe(2000);expect(total.register).toBe(23500);
  });
  it('does not treat missing mandatory values as zero',()=>{
    expect(calculate({...fixture,ideal_cents:null}).result).toBeNull();
  });
  it('parses decimal input without float multiplication or silent rounding',()=>{
    expect(parseMoney('0,29')).toBe(29);expect(parseMoney('12.5')).toBe(1250);
    for(const value of ['', '-1','1,234','1.000,00','NaN','1e3']) expect(parseMoney(value)).toBeNull();
  });
  it('synchronizes amount and quantity and refuses fractions of a denomination',()=>{
    expect(normalizeRow(2000,{quantity:'0',amount:'60,00',edited:'amount'})?.quantity).toBe(3);
    expect(normalizeRow(2000,{quantity:'0',amount:'65,00',edited:'amount'})).toBeNull();
    expect(normalizeRow(5,{quantity:'3',amount:'0',edited:'quantity'})?.row.amount).toBe('0,15');
    expect(normalizeRow(5,{quantity:'1.5',amount:'0',edited:'quantity'})).toBeNull();
    expect(normalizeRow(5,{quantity:' ',amount:'',edited:'quantity'})).toEqual({quantity:0,row:{quantity:'',amount:'',edited:'quantity'}});
  });
  it('uses only approved denominations, including 100 euro',()=>{
    expect(DENOMINATIONS).toContain(10000);expect(DENOMINATIONS).not.toContain(20000);expect(DENOMINATIONS).not.toContain(2);
  });
  it('keeps a shortage explanation in drafts but drops it on final submit without shortage',()=>{
    const draft=emptyDraft(loc,'2026-11-01');draft.rows[10000]={quantity:'2',amount:'',edited:'quantity'};
    draft.explanation='Fictieve toelichting';
    expect(validateDraft(draft,false,15000).payload.difference_explanation).toBe('Fictieve toelichting');
    expect(validateDraft(draft,true,15000).payload.difference_explanation).toBe('');
    draft.amounts.turnover_cents='100,00';
    expect(validateDraft(draft,true,15000).payload.difference_explanation).toBe('Fictieve toelichting');
  });
  it('starts with empty counts and every payment field at zero',()=>{
    const draft=emptyDraft(loc,'2026-11-01');
    expect(draft.rows[5000].quantity).toBe('');
    for(const value of Object.values(draft.amounts)) expect(value).toBe('0,00');
    expect(validateDraft(draft,false,15000).valid).toBe(true);
    expect(validateDraft(draft,true,15000).errors.cash).toBeTruthy();
  });
  it('requires a reason for daily opening changes and shortages',()=>{
    const draft=emptyDraft(loc,'2026-11-01');draft.rows[10000]={quantity:'2',amount:'200,00',edited:'quantity'};
    for(const field of Object.keys(draft.amounts) as (keyof typeof draft.amounts)[]) draft.amounts[field]='0,00';
    draft.opening='175,00';draft.amounts.turnover_cents='100,00';
    const result=validateDraft(draft,true,15000);
    expect(result.errors.openingReason).toBeTruthy();expect(result.errors.explanation).toBeTruthy();
  });
});
