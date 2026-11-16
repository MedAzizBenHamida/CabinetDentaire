CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
ALTER TABLE public.agenda_entries ADD CONSTRAINT agenda_no_overlap EXCLUDE USING gist (resource_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE (NOT is_cancelled);
CREATE OR REPLACE FUNCTION private.log_cabinet_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(to_jsonb(NEW)->>'id',to_jsonb(NEW)->>'user_id')::uuid); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.log_cabinet_change() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE f record; arguments text; identities text; call_args text; returns text; BEGIN
 FOR f IN SELECT p.oid,p.proname,p.proargnames FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND has_function_privilege('authenticated',p.oid,'EXECUTE') LOOP
  arguments:=pg_get_function_arguments(f.oid); identities:=pg_get_function_identity_arguments(f.oid); returns:=pg_get_function_result(f.oid);
  SELECT string_agg(format('%I',arg),',') INTO call_args FROM unnest(f.proargnames) arg;
  EXECUTE format('ALTER FUNCTION public.%I(%s) SET SCHEMA private',f.proname,identities);
  EXECUTE format('REVOKE ALL ON FUNCTION private.%I(%s) FROM PUBLIC,anon',f.proname,identities);
  EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s) TO authenticated',f.proname,identities);
  EXECUTE format('CREATE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql SECURITY INVOKER SET search_path='''' AS %L',f.proname,arguments,returns,format('SELECT private.%I(%s);',f.proname,call_args));
  EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC,anon',f.proname,identities);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',f.proname,identities);
 END LOOP;
END; $$;