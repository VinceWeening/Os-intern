-- Version matches the applied hosted migration. Supabase adds a public event
-- trigger helper. It is for schema events, not for direct Data API callers.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
