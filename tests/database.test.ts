import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import type { CashPayload } from '@/lib/cash/model';
import type { CashSnapshot } from '@/lib/supabase/database.types';
import { readFile, readdir } from 'node:fs/promises';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const EMPLOYEE = '20000000-0000-0000-0000-000000000001';
const OTHER = '20000000-0000-0000-0000-000000000002';
const MANAGER = '20000000-0000-0000-0000-000000000003';
const ADMIN = '20000000-0000-0000-0000-000000000004';
const HEILOO = '10000000-0000-0000-0000-000000000001';
const HHW = '10000000-0000-0000-0000-000000000002';
const CLOSING = '30000000-0000-0000-0000-000000000001';
let db: PGlite;

async function become(id: string, aal = 'aal2') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: id, aal })]);
  await db.exec('set role authenticated');
}

beforeAll(async () => {
  db = new PGlite();
  // Auth is simulated only here. The actual migration and PostgreSQL policies
  // run unmodified; no hosted test/production project is contacted.
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; grant usage on schema auth to anon, authenticated;
    create table auth.users(id uuid primary key, email text);
    create table auth.mfa_factors(id uuid default gen_random_uuid(), user_id uuid, status text, factor_type text);
    create function auth.uid() returns uuid language sql stable as $$
      select (nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'sub')::uuid;
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true),''), '{}')::jsonb;
    $$;
  `);
  const migrations = (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort();
  for (const migration of migrations) {
    await db.exec(await readFile(`supabase/migrations/${migration}`, 'utf8'));
  }
  for (const [id, name, role, location] of [
    [EMPLOYEE, 'Testmedewerker A', 'employee', HEILOO],
    [OTHER, 'Testmedewerker B', 'employee', HHW],
    [MANAGER, 'Testmanager', 'manager', null],
    [ADMIN, 'Testbeheerder', 'admin', null],
  ]) {
    await db.query('insert into auth.users(id,email) values ($1,$2)', [id, `${role}@voorbeeld.example`]);
    const accessRoleId = role === 'admin' ? '40000000-0000-0000-0000-000000000003' : role === 'manager' ? '40000000-0000-0000-0000-000000000002' : '40000000-0000-0000-0000-000000000001';
    await db.query('insert into public.profiles(id,full_name,role,access_role_id) values ($1,$2,$3,$4)', [id, name, role==='admin'?'manager':role, accessRoleId]);
    await db.query("insert into auth.mfa_factors(user_id,status,factor_type) values ($1,'verified','totp')", [id]);
    if (location) await db.query('insert into public.location_memberships values ($1,$2)', [id, location]);
  }
  await db.query('insert into public.cash_closings(id,location_id,work_date,employee_id,employee_name) values ($1,$2,$3,$4,$5)', [CLOSING, HEILOO, '2026-11-01', EMPLOYEE, 'Testmedewerker A']);
  await db.query('insert into public.cash_closings(location_id,work_date,employee_id,employee_name) values ($1,$2,$3,$4)', [HHW, '2026-11-01', OTHER, 'Testmedewerker B']);
  await db.query('insert into public.cash_count_lines values ($1,200,3,default)', [CLOSING]);
  await db.query("insert into public.closing_events(closing_id,actor_id,action,after_values) values ($1,$2,'created','{}')", [CLOSING, EMPLOYEE]);
});
afterEach(async () => { await db.exec('rollback; reset role'); });
afterAll(async () => { await db?.close(); });

describe('database access policies (actual PostgreSQL)', () => {
  it('denies anonymous reads', async () => {
    await db.exec('set role anon');
    await expect(db.query('select * from public.locations')).rejects.toThrow(/permission denied/);
  });
  it('denies AAL1 access even with an assigned location', async () => {
    await become(EMPLOYEE, 'aal1');
    for (const table of ['profiles', 'locations', 'location_memberships', 'cash_closings', 'cash_count_lines', 'closing_events']) {
      expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
    }
  });
  it('restricts employees to their assigned location and own closings', async () => {
    await become(EMPLOYEE);
    expect((await db.query<{ slug: string }>('select slug from public.locations')).rows.map(row => row.slug)).toEqual(['heiloo']);
    expect((await db.query('select * from public.cash_closings')).rows).toHaveLength(1);
    expect((await db.query('select * from public.cash_count_lines')).rows).toHaveLength(1);
    expect((await db.query('select * from public.closing_events')).rows).toHaveLength(1);
  });
  it('hides another location details and audit from employees', async () => {
    await become(OTHER);
    expect((await db.query('select * from public.cash_count_lines')).rows).toHaveLength(0);
    expect((await db.query('select * from public.closing_events')).rows).toHaveLength(0);
  });
  it('lets managers read both locations without a membership', async () => {
    await become(MANAGER);
    expect((await db.query('select * from public.locations')).rows).toHaveLength(2);
    expect((await db.query('select * from public.cash_closings')).rows).toHaveLength(2);
    expect((await db.query('select * from public.profiles')).rows).toHaveLength(1);
  });
  it('does not let employees or managers promote roles or write closings', async () => {
    for (const id of [EMPLOYEE, MANAGER]) {
      await become(id);
      await expect(db.query("update public.profiles set role='manager'")).rejects.toThrow(/permission denied/);
      await expect(db.query('delete from public.cash_closings')).rejects.toThrow(/permission denied/);
      await expect(db.query("insert into public.profiles(id,full_name) values (gen_random_uuid(),'Fake')")).rejects.toThrow(/permission denied/);
    }
  });
  it('rejects a stale AAL2 token after all verified factors are removed', async () => {
    await db.query('delete from auth.mfa_factors where user_id=$1', [EMPLOYEE]);
    await become(EMPLOYEE);
    expect((await db.query('select * from public.locations')).rows).toHaveLength(0);
    await db.exec('reset role');
    await db.query("insert into auth.mfa_factors(user_id,status,factor_type) values ($1,'verified','totp')", [EMPLOYEE]);
  });
  it('revokes disabled accounts and removed assignments immediately', async () => {
    await db.query('update public.profiles set active=false where id=$1', [EMPLOYEE]);
    await become(EMPLOYEE);
    expect((await db.query('select * from public.locations')).rows).toHaveLength(0);
    await db.exec('reset role');
    await db.query('update public.profiles set active=true where id=$1', [EMPLOYEE]);
    await db.query('delete from public.location_memberships where user_id=$1', [EMPLOYEE]);
    await become(EMPLOYEE);
    expect((await db.query('select * from public.cash_closings')).rows).toHaveLength(0);
    await db.exec('reset role');
    await db.query('insert into public.location_memberships values ($1,$2)', [EMPLOYEE, HEILOO]);
  });
});

describe('foundation database constraints', () => {
  it('rejects negative quantities and non-euro denominations', async () => {
    await expect(db.query('insert into public.cash_count_lines values ($1,100,-1,default)', [CLOSING])).rejects.toThrow(/check constraint/);
    await expect(db.query('insert into public.cash_count_lines values ($1,3,1,default)', [CLOSING])).rejects.toThrow(/check constraint/);
    expect((await db.query<{ subtotal_cents: number }>('select subtotal_cents from public.cash_count_lines')).rows[0].subtotal_cents).toBe(600);
  });
  it('requires a reason when reopening', async () => {
    await expect(db.query("insert into public.closing_events(closing_id,actor_id,action,after_values) values ($1,$2,'reopened','{}')", [CLOSING, MANAGER])).rejects.toThrow(/reopening_requires_reason/);
  });
  it('requires a variance explanation before submission', async () => {
    await expect(db.query("update public.cash_closings set status='submitted',expected_cents=100,counted_cents=200,first_submitted_at=now(),submission_key=gen_random_uuid() where id=$1", [CLOSING])).rejects.toThrow(/cash_ready_for_submission/);
  });
  it('reserves one final closing per location/day, also after reopening', async () => {
    await db.query("update public.cash_closings set status='submitted',expected_cents=600,counted_cents=600,opening_cents=0,opening_default_cents=0,turnover_cents=600,ideal_cents=0,shop_vouchers_cents=0,pax_cents=0,paynl_cents=0,first_submitted_at=now(),submission_key=gen_random_uuid() where id=$1", [CLOSING]);
    await db.query("update public.cash_closings set status='draft' where id=$1", [CLOSING]);
    await expect(db.query("insert into public.cash_closings(location_id,work_date,employee_id,employee_name,status,expected_cents,counted_cents,opening_cents,opening_default_cents,turnover_cents,ideal_cents,shop_vouchers_cents,pax_cents,paynl_cents,first_submitted_at,submission_key) values ($1,'2026-11-01',$2,'Test','submitted',0,0,0,0,0,0,0,0,0,now(),gen_random_uuid())", [HEILOO, EMPLOYEE])).rejects.toThrow(/one_final_closing_per_location_day/);
  });
});

describe('complete OS cash workflow',()=>{
 beforeEach(async()=>{await db.exec('begin');});
 afterEach(async()=>{await db.exec('rollback; reset role');});
 function payload(changes:Partial<CashPayload>={}):CashPayload{return {
  location_id:HEILOO,work_date:'2026-11-02',counts:{10000:1,5000:2},opening_cents:15000,opening_reason:'',
  turnover_cents:10000,sold_vouchers_cents:0,ideal_cents:1000,shop_vouchers_cents:500,redeemed_vouchers_cents:500,pax_cents:2500,paynl_cents:1000,
  difference_explanation:'',notes:'Fictieve telling',...changes,
 };}
 async function save(id:string,version:number,value:CashPayload,submit=false,key:string|null=null){return (await db.query<{snapshot:CashSnapshot}>('select public.save_cash_closing($1,$2,$3::jsonb,$4,$5) as snapshot',[id,version,JSON.stringify(value),submit,key])).rows[0].snapshot;}
 async function transition(id:string,version:number,action:string,reason:string|null=null){return (await db.query<{snapshot:CashSnapshot}>('select public.transition_cash_closing($1,$2,$3,$4) as snapshot',[id,version,action,reason])).rows[0].snapshot;}
 async function rejected(action:()=>Promise<unknown>,message:RegExp){await db.exec('savepoint rejected');await expect(action()).rejects.toThrow(message);await db.exec('rollback to savepoint rejected; release savepoint rejected');}

 it('computes the actual paper formulas on the server and records the real employee',async()=>{
  await become(EMPLOYEE);const result=await save(randomUUID(),0,payload(),true,randomUUID());
  expect(result.closing).toMatchObject({employee_id:EMPLOYEE,employee_name:'Testmedewerker A',counted_cents:20000,cash_cents:5000,required_cents:10000,result_cents:-500,register_cents:23500,status:'submitted'});
  expect(Object.keys(result.counts)).toHaveLength(11);
 });
 it('saves incomplete drafts, resumes by version and preserves the default opening snapshot',async()=>{
  await become(EMPLOYEE);const id=randomUUID();const draft=await save(id,0,payload({ideal_cents:null,turnover_cents:null,counts:{}}));
  expect(draft.closing.status).toBe('draft');expect(draft.closing.result_cents).toBeNull();
  const resumed=await save(id,1,payload());expect(resumed.closing.version).toBe(2);expect(resumed.closing.opening_default_cents).toBe(15000);
 });
 it('rejects missing required amounts before submission',async()=>{
  await become(EMPLOYEE);await rejected(()=>save(randomUUID(),0,payload({pax_cents:null}),true,randomUUID()),/INVALID_AMOUNT/);
 });
 it('rejects negative cash, unsupported denominations and fractional quantities',async()=>{
  await become(EMPLOYEE);
  await rejected(()=>save(randomUUID(),0,payload({counts:{5000:1}}),true,randomUUID()),/NEGATIVE_CASH/);
  await rejected(()=>save(randomUUID(),0,payload({counts:{20000:1}})),/INVALID_DENOMINATION/);
  await rejected(()=>save(randomUUID(),0,payload({counts:{10000:1.5}})),/INVALID_QUANTITY/);
 });
 it('requires a reason for changed opening and for a shortage, not normal tips',async()=>{
  await become(EMPLOYEE);
  await rejected(()=>save(randomUUID(),0,payload({opening_cents:17500}),true,randomUUID()),/OPENING_REASON_REQUIRED/);
  await rejected(()=>save(randomUUID(),0,payload({turnover_cents:20000}),true,randomUUID()),/SHORTAGE_REASON_REQUIRED/);
  const result=await save(randomUUID(),0,payload({turnover_cents:20000,difference_explanation:'Fictief tekort verklaard'}),true,randomUUID());expect(result.closing.result_cents).toBe(9500);
 });
 it('enforces MFA, branch assignment and ownership on writes',async()=>{
  await become(EMPLOYEE,'aal1');await rejected(()=>save(randomUUID(),0,payload()),/CASH_FORBIDDEN/);
  await become(EMPLOYEE);await rejected(()=>save(randomUUID(),0,payload({location_id:HHW})),/LOCATION_FORBIDDEN/);
  const id=randomUUID();await save(id,0,payload());await become(OTHER);await rejected(()=>save(id,1,payload({location_id:HHW})),/CASH_FORBIDDEN/);
 });
 it('refuses a stale device version without changing the newer draft',async()=>{
  await become(EMPLOYEE);const id=randomUUID();await save(id,0,payload());await save(id,1,payload({notes:'Nieuwere versie'}));
  await rejected(()=>save(id,1,payload({notes:'Oude versie'})),/VERSION_CONFLICT/);
  expect((await db.query<{notes:string}>('select notes from public.cash_closings where id=$1',[id])).rows[0].notes).toBe('Nieuwere versie');
 });
 it('makes submission retries idempotent and locks submitted records',async()=>{
  await become(EMPLOYEE);const id=randomUUID(),key=randomUUID();const first=await save(id,0,payload(),true,key);
  const retry=await save(id,0,payload({turnover_cents:999}),true,key);expect(retry.closing.version).toBe(first.closing.version);expect(retry.closing.turnover_cents).toBe(10000);
  expect((await db.query("select * from public.closing_events where closing_id=$1 and action='submitted'",[id])).rows).toHaveLength(1);
  await rejected(()=>save(id,first.closing.version,payload({notes:'Vrij wijzigen'})),/CLOSING_LOCKED/);
 });
 it('allows exactly one final closing per branch/date, including after reopening',async()=>{
  await become(EMPLOYEE);const id=randomUUID();await save(id,0,payload(),true,randomUUID());
  await rejected(()=>save(randomUUID(),0,payload(),true,randomUUID()),/one_final_closing_per_location_day/);
  await become(MANAGER);await transition(id,1,'reopen','Fictieve correctie');await become(EMPLOYEE);
  await rejected(()=>save(randomUUID(),0,payload(),true,randomUUID()),/one_final_closing_per_location_day/);
 });
 it('runs draft → submitted → reviewed → reopened → corrected → resubmitted with full audit',async()=>{
  const id=randomUUID();await become(EMPLOYEE);await save(id,0,payload());const submitted=await save(id,1,payload(),true,randomUUID());
  await rejected(()=>transition(id,2,'review'),/CASH_FORBIDDEN/);
  await become(MANAGER);const reviewed=await transition(id,2,'review');expect(reviewed.closing.status).toBe('reviewed');
  expect((await transition(id,2,'review')).closing.version).toBe(3);
  await rejected(()=>transition(id,3,'reopen',''),/REOPEN_REASON_REQUIRED/);
  const reopened=await transition(id,3,'reopen','Correctie van fictieve opmerkingen');expect(reopened.closing.status).toBe('draft');
  const corrected=await save(id,4,payload({notes:'Gecorrigeerd door manager'}));expect(corrected.closing.employee_id).toBe(EMPLOYEE);
  const final=await save(id,5,payload({notes:'Gecorrigeerd door manager'}),true,randomUUID());expect(final.closing.first_submitted_at).toBe(submitted.closing.first_submitted_at);
  const events=await db.query<{action:string;actor_name:string;before_values:unknown;after_values:unknown}>('select action,actor_name,before_values,after_values from public.closing_events where closing_id=$1',[id]);
  expect(events.rows.map(e=>e.action)).toEqual(['created','submitted','reviewed','reopened','saved','submitted']);
  expect(events.rows[4].actor_name).toBe('Testmanager');expect(events.rows[4].before_values).toBeTruthy();
  await rejected(()=>save(id,1,payload({work_date:'2026-11-03'})),/CLOSING_LOCKED/);
 });
});

describe('configurable roles and user management', () => {
  const EMPLOYEE_ROLE = '40000000-0000-0000-0000-000000000001';
  const MANAGER_ROLE = '40000000-0000-0000-0000-000000000002';
  const ADMIN_ROLE = '40000000-0000-0000-0000-000000000003';
  beforeEach(async () => { await db.exec('begin'); });
  afterEach(async () => { await db.exec('rollback; reset role'); });

  async function saveUser(id: string, roleId: string, active = true, version = 1, locations = '{}') {
    return db.query('select public.admin_save_user($1,$2,$3,$4,$5::uuid[],$6,$7)',
      [id, 'Testnaam', roleId, active, locations, version, 'Toegang voor test bijgewerkt']);
  }
  async function saveRole(id: string | null, permissions = '{cash.open}', admin = false, allLocations = false, version = id ? 1 : 0) {
    return db.query<{ id: string }>('select public.admin_save_role($1,$2,$3,$4,$5,$6::text[],$7,$8) as id',
      [id, id ? 'Gewijzigde testrol' : 'Nieuwe testrol', 'Fictieve testrol', admin, allLocations, permissions, version, 'Rechten voor test bijgewerkt']);
  }

  it('only administrators may list account emails or manage permissions', async () => {
    for (const id of [EMPLOYEE, MANAGER]) {
      await become(id);
      await expect(db.query('select * from public.admin_list_users()')).rejects.toThrow(/ADMIN_REQUIRED/);
      await db.exec('rollback; begin');
      await become(id);
      await expect(saveRole(null)).rejects.toThrow(/ADMIN_REQUIRED/);
      await db.exec('rollback; begin');
      await become(id);
      await expect(saveUser(id, ADMIN_ROLE)).rejects.toThrow(/ADMIN_REQUIRED/);
      // Each failed statement aborts this test transaction. Restore a fresh one.
      await db.exec('rollback; begin');
    }
  });
  it('denies administrator RPCs before MFA verification', async () => {
    await become(ADMIN, 'aal1');
    await expect(db.query('select * from public.admin_list_users()')).rejects.toThrow(/ADMIN_REQUIRED/);
  });
  it('denies anonymous execution of admin functions', async () => {
    await db.exec('set role anon');
    await expect(db.query('select * from public.admin_list_users()')).rejects.toThrow(/permission denied/);
  });
  it('lists accounts for an active MFA-verified administrator', async () => {
    await become(ADMIN);
    expect((await db.query('select * from public.admin_list_users()')).rows).toHaveLength(4);
  });
  it('creates a custom role and writes an immutable audit snapshot', async () => {
    await become(ADMIN);
    const result = await saveRole(null, '{cash.open,cash.read_own}');
    const roleId = result.rows[0].id;
    expect((await db.query('select * from public.app_roles where id=$1', [roleId])).rows).toHaveLength(1);
    const events = await db.query<{ actor_id: string; entity_id: string; before_values: unknown }>('select * from public.access_events where entity_id=$1', [roleId]);
    expect(events.rows[0].actor_id).toBe(ADMIN);
    expect(events.rows[0].before_values).toBeNull();
  });
  it('applies a user role and assignments in one transaction with version/audit', async () => {
    await become(ADMIN);
    await saveUser(EMPLOYEE, EMPLOYEE_ROLE, true, 1, `{${HEILOO},${HHW}}`);
    const result = await db.query<{ management_version: number }>('select management_version from public.profiles where id=$1', [EMPLOYEE]);
    expect(result.rows[0].management_version).toBe(2);
    expect((await db.query('select * from public.location_memberships where user_id=$1', [EMPLOYEE])).rows).toHaveLength(2);
    const audit = await db.query<{ before_values: { location_ids: string[] }; after_values: { location_ids: string[] } }>('select before_values,after_values from public.access_events where entity_id=$1', [EMPLOYEE]);
    expect(audit.rows[0].before_values.location_ids).toHaveLength(1);
    expect(audit.rows[0].after_values.location_ids).toHaveLength(2);
  });
  it('does not silently overwrite newer user edits', async () => {
    await become(ADMIN);
    await saveUser(EMPLOYEE, MANAGER_ROLE);
    await expect(saveUser(EMPLOYEE, EMPLOYEE_ROLE)).rejects.toThrow(/VERSION_CONFLICT/);
  });
  it('does not silently overwrite newer role edits', async () => {
    await become(ADMIN);
    await saveRole(MANAGER_ROLE);
    await expect(saveRole(MANAGER_ROLE)).rejects.toMatchObject({code:'PT409',message:'VERSION_CONFLICT'});
  });
  it('rejects unknown permissions and does not grant user management by role name', async () => {
    await become(ADMIN);
    await expect(saveRole(null, '{cash.open,users.manage}')).rejects.toThrow(/known_permissions/);
  });
  it('denies closing reads immediately after removing role permissions', async () => {
    await become(ADMIN);
    await saveRole(EMPLOYEE_ROLE, '{}');
    await become(EMPLOYEE);
    expect((await db.query('select * from public.cash_closings')).rows).toHaveLength(0);
    expect((await db.query('select * from public.cash_count_lines')).rows).toHaveLength(0);
  });
  it('read-all does not bypass personal location restrictions', async () => {
    await become(ADMIN);
    const roleId = (await saveRole(null, '{cash.open,cash.read_all}', false, false)).rows[0].id;
    await saveUser(EMPLOYEE, roleId, true, 1, `{${HEILOO}}`);
    await become(EMPLOYEE);
    expect((await db.query('select * from public.locations')).rows).toHaveLength(1);
    expect((await db.query('select * from public.cash_closings')).rows).toHaveLength(1);
  });
  it('cannot deactivate the last administrator', async () => {
    await become(ADMIN);
    await expect(saveUser(ADMIN, ADMIN_ROLE, false)).rejects.toThrow(/LAST_ADMIN/);
  });
  it('cannot demote the last administrator through user editing', async () => {
    await become(ADMIN);
    await expect(saveUser(ADMIN, EMPLOYEE_ROLE)).rejects.toThrow(/LAST_ADMIN/);
  });
  it('cannot remove admin status from the last administrator role', async () => {
    await become(ADMIN);
    await expect(saveRole(ADMIN_ROLE, '{}', false)).rejects.toThrow(/LAST_ADMIN/);
  });
  it('can demote an administrator after assigning a replacement', async () => {
    await become(ADMIN);
    await saveUser(MANAGER, ADMIN_ROLE);
    await saveUser(ADMIN, EMPLOYEE_ROLE);
    await expect(db.query('select * from public.admin_list_users()')).rejects.toThrow(/ADMIN_REQUIRED/);
  });
  it('rejects unknown locations without partial profile changes', async () => {
    await become(ADMIN);
    await expect(saveUser(EMPLOYEE, EMPLOYEE_ROLE, true, 1, '{99999999-0000-0000-0000-000000000001}')).rejects.toThrow(/INVALID_LOCATION/);
  });
});
