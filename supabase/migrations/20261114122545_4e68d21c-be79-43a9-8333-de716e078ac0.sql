CREATE FUNCTION private.save_patient_record(patient_id uuid, given_name text, family_name text, date_of_birth date, tunisian_phone text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result uuid; BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 IF given_name IS NULL OR family_name IS NULL OR date_of_birth IS NULL OR tunisian_phone IS NULL THEN RAISE EXCEPTION 'Identité requise.' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(lower(btrim(given_name))||'|'||lower(btrim(family_name))||'|'||date_of_birth::text||'|'||tunisian_phone,216));
 IF EXISTS(SELECT 1 FROM public.patients WHERE lower(first_name)=lower(btrim(given_name)) AND lower(last_name)=lower(btrim(family_name)) AND birth_date=date_of_birth AND phone=tunisian_phone AND id IS DISTINCT FROM patient_id) THEN RAISE EXCEPTION 'Une fiche de même identité existe déjà : la consulter avant association.' USING ERRCODE='23505'; END IF;
 IF patient_id IS NULL THEN INSERT INTO public.patients(first_name,last_name,birth_date,phone) VALUES(btrim(given_name),btrim(family_name),date_of_birth,tunisian_phone) RETURNING id INTO result;
 ELSE UPDATE public.patients SET first_name=btrim(given_name),last_name=btrim(family_name),birth_date=date_of_birth,phone=tunisian_phone WHERE id=patient_id RETURNING id INTO result; END IF;
 IF result IS NULL THEN RAISE EXCEPTION 'Patient introuvable.' USING ERRCODE='22023'; END IF; RETURN result; END; $$;
REVOKE ALL ON FUNCTION private.save_patient_record(uuid,text,text,date,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION private.save_patient_record(uuid,text,text,date,text) TO authenticated;
CREATE FUNCTION public.save_patient_record(patient_id uuid,given_name text,family_name text,date_of_birth date,tunisian_phone text) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.save_patient_record(patient_id,given_name,family_name,date_of_birth,tunisian_phone); $$;
REVOKE ALL ON FUNCTION public.save_patient_record(uuid,text,text,date,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_patient_record(uuid,text,text,date,text) TO authenticated;
REVOKE INSERT,UPDATE ON public.patients FROM authenticated;

CREATE FUNCTION private.available_request_periods(requested_date date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; BEGIN
 IF requested_date IS NULL OR NOT isfinite(requested_date) OR requested_date<(now() AT TIME ZONE 'Africa/Tunis')::date THEN RETURN '[]'::jsonb; END IF;
 SELECT coalesce(jsonb_agg(period ORDER BY period),'[]'::jsonb) INTO result FROM (SELECT DISTINCT p.period FROM (VALUES('MORNING',time '08:00',time '13:00'),('AFTERNOON',time '15:00',time '17:00')) p(period,begins,finishes) WHERE EXISTS(SELECT 1 FROM public.opening_intervals o JOIN public.care_resources r ON r.id=o.resource_id WHERE r.is_active AND o.weekday=extract(dow FROM requested_date)::integer AND o.opens_at<p.finishes AND o.closes_at>p.begins AND NOT EXISTS(SELECT 1 FROM public.exceptional_closures c WHERE c.resource_id=r.id AND c.closed_on=requested_date)))v;
 RETURN result; END; $$;
REVOKE ALL ON FUNCTION private.available_request_periods(date) FROM PUBLIC; GRANT USAGE ON SCHEMA private TO anon; GRANT EXECUTE ON FUNCTION private.available_request_periods(date) TO anon,authenticated;
CREATE FUNCTION public.available_request_periods(requested_date date) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.available_request_periods(requested_date); $$;
REVOKE ALL ON FUNCTION public.available_request_periods(date) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.available_request_periods(date) TO anon,authenticated;

CREATE FUNCTION private.remove_schedule_configuration(record_id uuid, configuration_kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE rid uuid; BEGIN
 IF NOT(private.current_staff_has_role('SUPER_ADMIN') OR private.current_staff_has_role('ADMIN')) THEN RAISE EXCEPTION 'Administrateur requis.' USING ERRCODE='42501'; END IF;
 IF configuration_kind='OPENING' THEN SELECT resource_id INTO rid FROM public.opening_intervals WHERE id=record_id;
 ELSIF configuration_kind='CLOSURE' THEN SELECT resource_id INTO rid FROM public.exceptional_closures WHERE id=record_id;
 ELSE RAISE EXCEPTION 'Configuration invalide.' USING ERRCODE='22023'; END IF;
 IF rid IS NULL THEN RAISE EXCEPTION 'Configuration introuvable.' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.care_resources WHERE id=rid FOR UPDATE;
 IF configuration_kind='OPENING' THEN DELETE FROM public.opening_intervals WHERE id=record_id; ELSE DELETE FROM public.exceptional_closures WHERE id=record_id; END IF;
 INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(auth.uid(),'REMOVE_CONFIGURATION',configuration_kind,record_id); END; $$;
REVOKE ALL ON FUNCTION private.remove_schedule_configuration(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION private.remove_schedule_configuration(uuid,text) TO authenticated;
CREATE FUNCTION public.remove_schedule_configuration(record_id uuid,configuration_kind text) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.remove_schedule_configuration(record_id,configuration_kind); $$;
REVOKE ALL ON FUNCTION public.remove_schedule_configuration(uuid,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.remove_schedule_configuration(uuid,text) TO authenticated;

CREATE FUNCTION private.read_cabinet_audit(page_size integer,page_offset integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; BEGIN
 IF NOT private.current_staff_has_role('SUPER_ADMIN') THEN RAISE EXCEPTION 'Super administrateur requis.' USING ERRCODE='42501'; END IF;
 IF page_size IS NULL OR page_size NOT BETWEEN 1 AND 100 OR page_offset IS NULL OR page_offset<0 THEN RAISE EXCEPTION 'Pagination invalide.' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) INTO result FROM(SELECT * FROM public.cabinet_audit_events ORDER BY created_at DESC,id LIMIT page_size OFFSET page_offset)e;
 RETURN result; END; $$;
REVOKE ALL ON FUNCTION private.read_cabinet_audit(integer,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION private.read_cabinet_audit(integer,integer) TO authenticated;
CREATE FUNCTION public.read_cabinet_audit(page_size integer DEFAULT 25,page_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.read_cabinet_audit(page_size,page_offset); $$;
REVOKE ALL ON FUNCTION public.read_cabinet_audit(integer,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.read_cabinet_audit(integer,integer) TO authenticated;

DO $$ DECLARE rid uuid:=gen_random_uuid(); d date:=(now() AT TIME ZONE 'Africa/Tunis')::date+30; base timestamptz; n integer; BEGIN
 BEGIN
  INSERT INTO public.care_resources(id,name) VALUES(rid,'TEST TEMPORAIRE');
  INSERT INTO public.opening_intervals(resource_id,weekday,opens_at,closes_at) VALUES(rid,extract(dow FROM d)::integer,'08:00','13:00');
  IF NOT (public.available_request_periods(d) ? 'MORNING') THEN RAISE EXCEPTION 'TEST FAILED: morning compatibility'; END IF;
  BEGIN INSERT INTO public.appointment_requests(first_name,last_name,phone,desired_date,desired_period,status) VALUES('Test','Temporaire','+21612345678',d,'MORNING','CONFIRMED'); RAISE EXCEPTION 'TEST FAILED: initial status'; EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO public.appointment_requests(first_name,last_name,phone,desired_date,desired_period) VALUES('Test','Temporaire','+21612345678',d,'MORNING');
  BEGIN INSERT INTO public.appointment_requests(first_name,last_name,phone,desired_date,desired_period) VALUES('Test','Temporaire','+21612345678',d,'MORNING'); RAISE EXCEPTION 'TEST FAILED: duplicate request'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN INSERT INTO public.patients(first_name,last_name,birth_date,phone) VALUES('Test','Temporaire',date '2000-01-01','12345678'); RAISE EXCEPTION 'TEST FAILED: Tunisian phone'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO public.patients(first_name,last_name,birth_date,phone) VALUES('Test','Temporaire',d,'+21612345678'); RAISE EXCEPTION 'TEST FAILED: future birth date'; EXCEPTION WHEN check_violation THEN NULL; END;
  base:=(d+time '09:00') AT TIME ZONE 'Africa/Tunis';
  INSERT INTO public.agenda_entries(resource_id,kind,starts_at,ends_at) VALUES(rid,'BLOCK',base,base+interval '1 hour');
  BEGIN INSERT INTO public.agenda_entries(resource_id,kind,starts_at,ends_at) VALUES(rid,'BLOCK',base+interval '30 minutes',base+interval '90 minutes'); RAISE EXCEPTION 'TEST FAILED: overlap'; EXCEPTION WHEN exclusion_violation THEN NULL; END;
  INSERT INTO public.agenda_entries(resource_id,kind,starts_at,ends_at) VALUES(rid,'BLOCK',base+interval '1 hour',base+interval '2 hours');
  BEGIN PERFORM public.read_medical_notes(gen_random_uuid()); RAISE EXCEPTION 'TEST FAILED: unauthenticated medical read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.save_medical_note(NULL,gen_random_uuid(),'Test',NULL,false); RAISE EXCEPTION 'TEST FAILED: unauthenticated medical edit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RAISE EXCEPTION 'Roll back successful fixtures' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.care_resources WHERE id=rid) THEN RAISE EXCEPTION 'TEST FAILED: fixture cleanup'; END IF;
END; $$;