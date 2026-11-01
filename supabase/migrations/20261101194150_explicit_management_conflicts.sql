-- An optimistic version conflict is not a retryable serialization failure.
-- PostgREST 14 may retry SQLSTATE 40001 indefinitely. PT409 returns HTTP 409.
-- Preserve the previously reviewed function bodies and their privileges.
do $$
declare signature text; definition text;
begin
  foreach signature in array array[
    'private.admin_save_user(uuid,text,uuid,boolean,uuid[],integer,text)',
    'private.admin_save_role(uuid,text,text,boolean,boolean,text[],integer,text)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    if position('errcode=''40001''' in definition) = 0 then
      raise exception 'Expected version-conflict statement missing in %', signature;
    end if;
    execute replace(definition, 'errcode=''40001''', 'errcode=''PT409''');
  end loop;
end;
$$;
