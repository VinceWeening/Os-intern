-- Approved OS paper form v1. All money is integer cents.
alter table public.locations add column default_opening_cents bigint not null default 15000 check(default_opening_cents between 0 and 100000000);
alter table public.cash_closings
 add column form_version integer not null default 1 check(form_version=1),
 add column opening_default_cents bigint not null default 15000,
 add column opening_cents bigint not null default 15000 check(opening_cents between 0 and 100000000),
 add column opening_reason text not null default '' check(length(opening_reason)<=4000),
 add column turnover_cents bigint check(turnover_cents between 0 and 100000000),
 add column sold_vouchers_cents bigint default 0 check(sold_vouchers_cents between 0 and 100000000),
 add column ideal_cents bigint check(ideal_cents between 0 and 100000000),
 add column shop_vouchers_cents bigint check(shop_vouchers_cents between 0 and 100000000),
 add column redeemed_vouchers_cents bigint default 0 check(redeemed_vouchers_cents between 0 and 100000000),
 add column pax_cents bigint check(pax_cents between 0 and 100000000),
 add column paynl_cents bigint check(paynl_cents between 0 and 100000000),
 add column last_submitted_at timestamptz,
 add column cash_cents bigint generated always as(counted_cents-opening_cents) stored,
 add column required_cents bigint generated always as(turnover_cents+sold_vouchers_cents) stored,
 add column result_cents bigint generated always as(turnover_cents+sold_vouchers_cents-ideal_cents-shop_vouchers_cents-redeemed_vouchers_cents-pax_cents-paynl_cents-(counted_cents-opening_cents)) stored,
 add column register_cents bigint generated always as(pax_cents+paynl_cents+counted_cents) stored;
alter table public.closing_events add column actor_name text not null default 'Onbekend';
alter table public.cash_closings drop constraint submitted_has_amounts;
alter table public.cash_closings add constraint cash_ready_for_submission check(status='draft' or (
 turnover_cents is not null and sold_vouchers_cents is not null and ideal_cents is not null
 and shop_vouchers_cents is not null and redeemed_vouchers_cents is not null and pax_cents is not null and paynl_cents is not null
 and counted_cents>=opening_cents and first_submitted_at is not null and submission_key is not null
 and (opening_cents=opening_default_cents or length(trim(opening_reason))>0)
 and (result_cents<=0 or length(trim(difference_explanation))>0)));
comment on column public.cash_closings.difference_cents is 'Legacy field; OS v1 uses result_cents (required minus payment sources).';

create or replace function private.can_read_closing(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cash_closings c where c.id=target and private.can_access_location(c.location_id)
  and (private.has_permission('cash.read_all') or (c.employee_id=(select auth.uid())
   and (private.has_permission('cash.read_own') or private.has_permission('cash.submit')))));
$$;
drop policy closings_read on public.cash_closings;
create policy closings_read on public.cash_closings for select to authenticated using(private.can_read_closing(id));

create function private.can_edit_closing(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_permission('cash.submit') and exists(select 1 from public.cash_closings c
  where c.id=target and private.can_access_location(c.location_id) and c.status='draft'
   and (c.employee_id=(select auth.uid()) or (c.first_submitted_at is not null and private.has_permission('cash.reopen'))));
$$;

create function private.cash_snapshot(target uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('closing',to_jsonb(c),'counts',coalesce((
   select jsonb_object_agg(l.denomination_cents::text,l.quantity) from public.cash_count_lines l where l.closing_id=c.id),'{}'::jsonb))
 from public.cash_closings c where c.id=target;
$$;
create function private.cash_amount(payload jsonb, field text, required boolean default false) returns bigint
language plpgsql immutable set search_path='' as $$
declare value text;
begin
 value=payload->>field;
 if value is null and not required then return null; end if;
 if value is null or jsonb_typeof(payload->field)<>'number' or value!~'^\d+$' or length(value)>9 or value::bigint>100000000 then
  raise exception 'INVALID_AMOUNT: %',field using errcode='22023';
 end if;
 return value::bigint;
end;
$$;

create function private.save_cash_closing(p_id uuid,p_expected_version integer,p_payload jsonb,p_submit boolean,p_submission_key uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare
 old public.cash_closings; before_snapshot jsonb; loc uuid; day date; opening bigint; opening_default bigint;
 counted bigint=0; d integer; q bigint; raw text; field text; amounts bigint[]='{}';
 quantity_json jsonb='{}'; actor text; required_amount bigint; result_amount bigint; event_action text;
begin
 if not private.has_permission('cash.submit') then raise exception 'CASH_FORBIDDEN' using errcode='42501'; end if;
 if p_id is null or p_expected_version is null or p_expected_version<0 or p_submit is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then
  raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,731002));
 -- Current authorization is checked again after a concurrent transaction.
 if not private.has_permission('cash.submit') then raise exception 'CASH_FORBIDDEN' using errcode='42501'; end if;
 select * into old from public.cash_closings where id=p_id for update;
 if old.id is not null then
  if not private.can_read_closing(p_id) then raise exception 'CASH_FORBIDDEN' using errcode='42501'; end if;
  if p_submit and p_submission_key is not null and old.submission_key=p_submission_key and old.status in ('submitted','reviewed') then
   return private.cash_snapshot(p_id);
  end if;
  if not private.can_edit_closing(p_id) then raise exception 'CLOSING_LOCKED' using errcode='42501'; end if;
  if old.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
  before_snapshot=private.cash_snapshot(p_id);
 elsif p_expected_version<>0 then raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
 loc=(p_payload->>'location_id')::uuid;
 if loc is null or not private.can_access_location(loc) then raise exception 'LOCATION_FORBIDDEN' using errcode='42501'; end if;
 if coalesce(p_payload->>'work_date','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'INVALID_DATE' using errcode='22023'; end if;
 day=(p_payload->>'work_date')::date;
 if old.first_submitted_at is not null and (loc<>old.location_id or day<>old.work_date) then
  raise exception 'FINAL_IDENTITY_LOCKED' using errcode='22023'; end if;
 if old.id is null then select default_opening_cents into opening_default from public.locations where id=loc;
 else opening_default=old.opening_default_cents; end if;
 opening=private.cash_amount(p_payload,'opening_cents',true);
 if jsonb_typeof(p_payload->'counts') is distinct from 'object' then raise exception 'INVALID_COUNTS' using errcode='22023'; end if;
 if exists(select 1 from jsonb_object_keys(p_payload->'counts') x where x<>all(array['10000','5000','2000','1000','500','200','100','50','20','10','5'])) then
  raise exception 'INVALID_DENOMINATION' using errcode='22023'; end if;
 foreach d in array array[10000,5000,2000,1000,500,200,100,50,20,10,5] loop
  raw=coalesce(p_payload->'counts'->>d::text,'0');
  if raw!~'^\d+$' or length(raw)>5 or raw::bigint>10000 or (p_payload->'counts' ? d::text and jsonb_typeof(p_payload->'counts'->d::text)<>'number') then
   raise exception 'INVALID_QUANTITY' using errcode='22023'; end if;
  q=raw::bigint; counted=counted+d::bigint*q;
  quantity_json=quantity_json||jsonb_build_object(d::text,q);
 end loop;
 foreach field in array array['turnover_cents','sold_vouchers_cents','ideal_cents','shop_vouchers_cents','redeemed_vouchers_cents','pax_cents','paynl_cents'] loop
  amounts=array_append(amounts,private.cash_amount(p_payload,field,p_submit));
 end loop;
 foreach field in array array['opening_reason','difference_explanation','notes'] loop
  if length(coalesce(p_payload->>field,''))>4000 then raise exception 'TEXT_TOO_LONG' using errcode='22023'; end if;
 end loop;
 required_amount=amounts[1]+amounts[2];
 result_amount=required_amount-amounts[3]-amounts[4]-amounts[5]-amounts[6]-amounts[7]-(counted-opening);
 if p_submit then
  if p_submission_key is null then raise exception 'SUBMISSION_KEY_REQUIRED' using errcode='22023'; end if;
  if counted<opening then raise exception 'NEGATIVE_CASH' using errcode='22023'; end if;
  if opening<>opening_default and length(trim(coalesce(p_payload->>'opening_reason','')))=0 then raise exception 'OPENING_REASON_REQUIRED' using errcode='22023'; end if;
  if result_amount>0 and length(trim(coalesce(p_payload->>'difference_explanation','')))=0 then raise exception 'SHORTAGE_REASON_REQUIRED' using errcode='22023'; end if;
 end if;
 select full_name into actor from public.profiles where id=(select auth.uid());
 if old.id is null then
  insert into public.cash_closings(id,location_id,work_date,employee_id,employee_name,opening_default_cents)
  values(p_id,loc,day,auth.uid(),actor,opening_default);
 end if;
 update public.cash_closings set location_id=loc,work_date=day,opening_cents=opening,
  opening_reason=trim(coalesce(p_payload->>'opening_reason','')),counted_cents=counted,expected_cents=required_amount,
  turnover_cents=amounts[1],sold_vouchers_cents=amounts[2],ideal_cents=amounts[3],shop_vouchers_cents=amounts[4],
  redeemed_vouchers_cents=amounts[5],pax_cents=amounts[6],paynl_cents=amounts[7],
  difference_explanation=trim(coalesce(p_payload->>'difference_explanation','')),notes=trim(coalesce(p_payload->>'notes','')),
  version=case when old.id is null then 1 else old.version+1 end,updated_at=now(),
  status=case when p_submit then 'submitted'::public.closing_status else 'draft'::public.closing_status end,
  first_submitted_at=case when p_submit then coalesce(old.first_submitted_at,now()) else old.first_submitted_at end,
  last_submitted_at=case when p_submit then now() else old.last_submitted_at end,
  submission_key=case when p_submit then p_submission_key else old.submission_key end
 where id=p_id;
 delete from public.cash_count_lines where closing_id=p_id;
 insert into public.cash_count_lines(closing_id,denomination_cents,quantity)
 select p_id,key::integer,value::integer from jsonb_each_text(quantity_json);
 event_action=case when p_submit then 'submitted' when old.id is null then 'created' else 'saved' end;
 insert into public.closing_events(closing_id,actor_id,actor_name,action,before_values,after_values)
 values(p_id,auth.uid(),actor,event_action,before_snapshot,private.cash_snapshot(p_id));
 return private.cash_snapshot(p_id);
end;
$$;

create function private.transition_cash_closing(p_id uuid,p_expected_version integer,p_action text,p_reason text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare old public.cash_closings; before_snapshot jsonb; actor text;
begin
 if p_action is null or p_action not in ('review','reopen') or not private.has_permission(case when p_action='review' then 'cash.review' else 'cash.reopen' end) then
  raise exception 'CASH_FORBIDDEN' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,731002));
 select * into old from public.cash_closings where id=p_id for update;
 if old.id is null or not private.can_read_closing(p_id) or not private.has_permission(case when p_action='review' then 'cash.review' else 'cash.reopen' end) then
  raise exception 'CASH_FORBIDDEN' using errcode='42501'; end if;
 if p_action='review' and old.status='reviewed' then return private.cash_snapshot(p_id); end if;
 if p_expected_version is null or old.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
 if p_action='review' and old.status<>'submitted' then raise exception 'INVALID_TRANSITION' using errcode='22023'; end if;
 if p_action='reopen' and (old.status='draft' or p_reason is null or length(trim(p_reason)) not between 3 and 4000) then
  raise exception 'REOPEN_REASON_REQUIRED' using errcode='22023'; end if;
 before_snapshot=private.cash_snapshot(p_id);
 select full_name into actor from public.profiles where id=(select auth.uid());
 update public.cash_closings set status=case when p_action='review' then 'reviewed'::public.closing_status else 'draft'::public.closing_status end,
  reviewed_at=case when p_action='review' then now() else null end,reviewed_by=case when p_action='review' then auth.uid() else null end,
  version=version+1,updated_at=now() where id=p_id;
 insert into public.closing_events(closing_id,actor_id,actor_name,action,reason,before_values,after_values)
 values(p_id,auth.uid(),actor,case when p_action='review' then 'reviewed' else 'reopened' end,
  case when p_action='reopen' then trim(p_reason) else null end,before_snapshot,private.cash_snapshot(p_id));
 return private.cash_snapshot(p_id);
end;
$$;

create function public.save_cash_closing(p_id uuid,p_expected_version integer,p_payload jsonb,p_submit boolean default false,p_submission_key uuid default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.save_cash_closing(p_id,p_expected_version,p_payload,p_submit,p_submission_key); $$;
create function public.transition_cash_closing(p_id uuid,p_expected_version integer,p_action text,p_reason text default null) returns jsonb
language sql security invoker set search_path='' as $$ select private.transition_cash_closing(p_id,p_expected_version,p_action,p_reason); $$;
revoke all on function private.can_edit_closing(uuid),private.cash_snapshot(uuid),private.cash_amount(jsonb,text,boolean),
 private.save_cash_closing(uuid,integer,jsonb,boolean,uuid),private.transition_cash_closing(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function private.can_edit_closing(uuid),private.save_cash_closing(uuid,integer,jsonb,boolean,uuid),private.transition_cash_closing(uuid,integer,text,text) to authenticated;
revoke all on function public.save_cash_closing(uuid,integer,jsonb,boolean,uuid),public.transition_cash_closing(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.save_cash_closing(uuid,integer,jsonb,boolean,uuid),public.transition_cash_closing(uuid,integer,text,text) to authenticated;
