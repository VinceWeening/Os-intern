-- Immutable published versions; existing closings retain their original definition.
create table public.cash_form_versions (
 id uuid primary key default gen_random_uuid(), location_id uuid not null references public.locations(id),
 version integer not null check(version>0), definition jsonb not null,
 created_at timestamptz not null default now(), unique(location_id,version)
);
alter table public.cash_form_versions enable row level security;
revoke all on public.cash_form_versions from public,anon,authenticated;
grant select on public.cash_form_versions to authenticated;
create policy form_versions_read on public.cash_form_versions for select to authenticated using(private.can_access_location(location_id));
alter table public.locations add column cash_form_id uuid references public.cash_form_versions(id);
alter table public.cash_closings add column form_definition_id uuid references public.cash_form_versions(id), add column form_schema jsonb, add column custom_inputs jsonb, add column custom_totals jsonb;
-- Keep canonical columns generated so reports and direct maintenance stay consistent.
alter table public.cash_closings drop constraint cash_ready_for_submission;
alter table public.cash_closings drop column cash_cents,drop column required_cents,drop column result_cents,drop column register_cents;
alter table public.cash_closings
 add column cash_cents bigint generated always as (coalesce((custom_totals->>'cash')::bigint,counted_cents-opening_cents)) stored,
 add column required_cents bigint generated always as (coalesce((custom_totals->>'required')::bigint,turnover_cents+sold_vouchers_cents)) stored,
 add column result_cents bigint generated always as (case when form_definition_id is not null then (custom_totals->>'result')::bigint else turnover_cents+sold_vouchers_cents-ideal_cents-shop_vouchers_cents-redeemed_vouchers_cents-pax_cents-paynl_cents-(counted_cents-opening_cents) end) stored,
 add column register_cents bigint generated always as (case when form_definition_id is not null then (custom_totals->>'register')::bigint else pax_cents+paynl_cents+counted_cents end) stored;
alter table public.cash_closings add constraint cash_ready_for_submission check(status='draft' or (
 turnover_cents is not null and sold_vouchers_cents is not null and ideal_cents is not null
 and shop_vouchers_cents is not null and redeemed_vouchers_cents is not null and pax_cents is not null and paynl_cents is not null
 and counted_cents>=opening_cents and first_submitted_at is not null and submission_key is not null
 and (opening_cents=opening_default_cents or length(trim(opening_reason))>0)
 and (result_cents<=0 or length(trim(difference_explanation))>0)));

insert into public.cash_form_versions(location_id,version,definition) select id,1,'{"opening": 15000, "fields": [{"key": "turnover_cents", "label": "Omzet op de kassa", "kind": "input", "required": true, "minimum": 0, "default": 0, "terms": []}, {"key": "sold_vouchers_cents", "label": "Verkochte cadeaubonnen", "kind": "input", "required": true, "minimum": 0, "default": 0, "terms": []}, {"key": "ideal_cents", "label": "iDEAL", "kind": "input", "required": true, "minimum": 0, "default": 0, "terms": []}, {"key": "pax_cents", "label": "PAX dagafsluiting", "kind": "input", "required": true, "minimum": 0, "default": 0, "terms": []}, {"key": "paynl_cents", "label": "Pay.nl", "kind": "input", "required": true, "minimum": 0, "default": 0, "terms": []}, {"key": "shop_vouchers_cents", "label": "Winkelbonnen", "kind": "input", "required": true, "minimum": 0, "default": 0, "terms": []}, {"key": "redeemed_vouchers_cents", "label": "Verzilverde cadeaubonnen", "kind": "input", "required": true, "minimum": 0, "default": 0, "terms": []}, {"key": "cash", "label": "Contant geld", "kind": "calculated", "required": true, "minimum": 0, "default": null, "terms": [{"key": "counted", "sign": 1}, {"key": "opening", "sign": -1}]}, {"key": "required", "label": "Totaal benodigd", "kind": "calculated", "required": true, "minimum": null, "default": null, "terms": [{"key": "turnover_cents", "sign": 1}, {"key": "sold_vouchers_cents", "sign": 1}]}, {"key": "result", "label": "Resultaat", "kind": "calculated", "required": true, "minimum": null, "default": null, "terms": [{"key": "required", "sign": 1}, {"key": "ideal_cents", "sign": -1}, {"key": "shop_vouchers_cents", "sign": -1}, {"key": "redeemed_vouchers_cents", "sign": -1}, {"key": "pax_cents", "sign": -1}, {"key": "paynl_cents", "sign": -1}, {"key": "cash", "sign": -1}]}, {"key": "register", "label": "In te vullen in de kassa", "kind": "calculated", "required": true, "minimum": null, "default": null, "terms": [{"key": "pax_cents", "sign": 1}, {"key": "paynl_cents", "sign": 1}, {"key": "cash", "sign": 1}, {"key": "opening", "sign": 1}]}]}'::jsonb || jsonb_build_object('opening',default_opening_cents) from public.locations;
update public.locations l set cash_form_id=f.id from public.cash_form_versions f where f.location_id=l.id;

create function private.evaluate_cash_form(definition jsonb,inputs jsonb,counted bigint,opening bigint,final boolean default false) returns jsonb
language plpgsql immutable set search_path='' as $$
declare f jsonb; term jsonb; values jsonb=jsonb_build_object('counted',counted,'opening',opening); value bigint; raw text; seen text[] = array['counted','opening']; k text; n text;
begin
 if jsonb_typeof(definition->'fields') is distinct from 'array' or jsonb_array_length(definition->'fields') not between 4 and 30
  or coalesce(definition->>'opening','') !~ '^\d{1,9}$' or (definition->>'opening')::bigint>100000000
  or jsonb_typeof(inputs) is distinct from 'object' then raise exception 'INVALID_FORM' using errcode='22023'; end if;
 for f in select x from jsonb_array_elements(definition->'fields') x loop
  k=f->>'key';
  if k is null or k !~ '^[a-z][a-z0-9_]{0,39}$' or k=any(seen) or coalesce(length(trim(f->>'label')),0) not between 1 and 100
   or coalesce(f->>'kind','') not in ('input','calculated') or jsonb_typeof(f->'required') is distinct from 'boolean'
   or jsonb_typeof(f->'terms') is distinct from 'array' or jsonb_array_length(f->'terms')>30 then
   raise exception 'INVALID_FORM' using errcode='22023'; end if;
  foreach n in array array['minimum','default'] loop
   if not f ? n or (f->n<>'null'::jsonb and (coalesce(f->>n,'')!~'^\d{1,9}$' or (f->>n)::bigint>100000000)) then
    raise exception 'INVALID_FORM' using errcode='22023'; end if;
  end loop;
  if (f->>'default')::bigint < (f->>'minimum')::bigint then raise exception 'INVALID_FORM' using errcode='22023'; end if;
  if f->>'kind'='input' then
   if k=any(array['cash','required','result','register']) then raise exception 'INVALID_FORM' using errcode='22023'; end if;
   raw=inputs->>k;
   if raw is not null and (jsonb_typeof(inputs->k)<>'number' or raw!~'^\d{1,9}$' or raw::bigint>100000000) then raise exception 'INVALID_AMOUNT' using errcode='22023'; end if;
   value=raw::bigint;
   if value is null and not (f->>'required')::boolean then value=0; end if;
  else
   if jsonb_array_length(f->'terms')=0 then raise exception 'INVALID_FORM' using errcode='22023'; end if;
   value=0;
   for term in select x from jsonb_array_elements(f->'terms') x loop
    if not coalesce(term->>'key'=any(seen),false) or coalesce(term->>'sign','') not in ('1','-1') then raise exception 'INVALID_FORM' using errcode='22023'; end if;
    value=value+(values->>(term->>'key'))::bigint*(term->>'sign')::integer;
   end loop;
  end if;
  if abs(value)>1000000000 or (final and (value is null and ((f->>'required')::boolean or k=any(array['cash','required','result','register'])) or value<(f->>'minimum')::bigint)) then
   raise exception 'FORM_VALIDATION_FAILED' using errcode='22023'; end if;
  values=values||jsonb_build_object(k,value); seen=array_append(seen,k);
 end loop;
 if not array['cash','required','result','register']::text[] <@ seen then raise exception 'INVALID_FORM' using errcode='22023'; end if;
 return values;
end;
$$;
create function private.admin_publish_cash_form(p_location_id uuid,p_definition jsonb,p_expected_id uuid,p_reason text) returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare old_id uuid; new_id uuid; next_version integer;
begin
 perform private.lock_access_management();
 if p_reason is null or length(trim(p_reason)) not between 3 and 500 then raise exception 'INVALID_REASON' using errcode='22023'; end if;
 select cash_form_id into old_id from public.locations where id=p_location_id for update;
 if not found then raise exception 'INVALID_LOCATION' using errcode='22023'; end if;
 if old_id is distinct from p_expected_id then raise exception 'VERSION_CONFLICT' using errcode='PT409'; end if;
 perform private.evaluate_cash_form(p_definition,'{}',0,0,false);
 select coalesce(max(version),0)+1 into next_version from public.cash_form_versions where location_id=p_location_id;
 insert into public.cash_form_versions(location_id,version,definition) values(p_location_id,next_version,p_definition) returning id into new_id;
 update public.locations set cash_form_id=new_id,default_opening_cents=(p_definition->>'opening')::bigint where id=p_location_id;
 insert into public.access_events(actor_id,entity_type,entity_id,reason,before_values,after_values)
 values(auth.uid(),'form',p_location_id,trim(p_reason),jsonb_build_object('form_id',old_id),jsonb_build_object('form_id',new_id,'definition',p_definition));
 return new_id;
end;
$$;
alter table public.access_events drop constraint access_events_entity_type_check;
alter table public.access_events add constraint access_events_entity_type_check check(entity_type in ('user','role','form'));
create function public.admin_publish_cash_form(p_location_id uuid,p_definition jsonb,p_expected_id uuid,p_reason text) returns uuid
language sql security invoker set search_path='' as $$ select private.admin_publish_cash_form(p_location_id,p_definition,p_expected_id,p_reason); $$;
revoke all on function private.evaluate_cash_form(jsonb,jsonb,bigint,bigint,boolean),private.admin_publish_cash_form(uuid,jsonb,uuid,text),public.admin_publish_cash_form(uuid,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function private.admin_publish_cash_form(uuid,jsonb,uuid,text),public.admin_publish_cash_form(uuid,jsonb,uuid,text) to authenticated;

-- Patch the canonical saver (before or after the shared-account migration).
do $patch$
declare target regprocedure; source text;
begin
 target=coalesce(to_regprocedure('private.save_cash_closing_core(uuid,integer,jsonb,boolean,uuid)'),to_regprocedure('private.save_cash_closing(uuid,integer,jsonb,boolean,uuid)'));
 source=pg_get_functiondef(target);
 source=replace(source,'event_action text;','event_action text; form_id uuid; form_definition jsonb; evaluated jsonb;');
 source=replace(source,'day=(p_payload->>''work_date'')::date;', $new$
 day=(p_payload->>'work_date')::date;
 form_id=case when old.id is not null then old.form_definition_id else (p_payload->>'form_definition_id')::uuid end;
 if old.id is not null and (p_payload->>'form_definition_id')::uuid is distinct from old.form_definition_id then raise exception 'FORM_VERSION_LOCKED' using errcode='PT409'; end if;
 if old.id is null and form_id is null and exists(select 1 from public.cash_form_versions f join public.locations l on l.cash_form_id=f.id where l.id=loc and f.version>1) then raise exception 'FORM_CHANGED' using errcode='PT409'; end if;
 if form_id is not null then
  select definition into form_definition from public.cash_form_versions where id=form_id and location_id=loc;
  if not found then raise exception 'INVALID_FORM' using errcode='22023'; end if;
  if old.id is null and form_id is distinct from (select cash_form_id from public.locations where id=loc) then raise exception 'FORM_CHANGED' using errcode='PT409'; end if;
 end if;
 $new$);
 source=replace(source,'opening=private.cash_amount(p_payload,''opening_cents'',true);', $new$
 if old.id is null and form_id is not null then opening_default=(form_definition->>'opening')::bigint; end if;
 opening=private.cash_amount(p_payload,'opening_cents',true);
 $new$);
 source=replace(source,$old$foreach field in array array['turnover_cents','sold_vouchers_cents','ideal_cents','shop_vouchers_cents','redeemed_vouchers_cents','pax_cents','paynl_cents'] loop$old$,$new$
 if form_id is not null then evaluated=private.evaluate_cash_form(form_definition,p_payload->'custom_inputs',counted,opening,p_submit); end if;
 foreach field in array array['turnover_cents','sold_vouchers_cents','ideal_cents','shop_vouchers_cents','redeemed_vouchers_cents','pax_cents','paynl_cents'] loop
 $new$);
 source=replace(source,$old$amounts=array_append(amounts,private.cash_amount(p_payload,field,p_submit));$old$, $old$amounts=array_append(amounts,case when form_id is null then private.cash_amount(p_payload,field,p_submit) else coalesce((evaluated->>field)::bigint,0) end);$old$);
 source=replace(source,'if p_submit then', $new$
 if form_id is not null then required_amount=(evaluated->>'required')::bigint; result_amount=(evaluated->>'result')::bigint; end if;
 if p_submit then
 $new$);
 source=replace(source,'update public.cash_closings set location_id=loc,work_date=day,opening_cents=opening,', $new$
 update public.cash_closings set location_id=loc,work_date=day,opening_cents=opening,
 form_definition_id=form_id,form_schema=form_definition,custom_inputs=case when form_id is not null then p_payload->'custom_inputs' else null end,custom_totals=evaluated,
 $new$);
 if source not like '%custom_totals=evaluated%' then raise exception 'SAVER_PATCH_FAILED'; end if;
 execute source;
end;
$patch$;
