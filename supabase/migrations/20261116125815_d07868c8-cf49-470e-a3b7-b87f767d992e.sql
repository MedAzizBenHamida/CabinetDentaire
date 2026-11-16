CREATE OR REPLACE FUNCTION private.resolve_request_patient(request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE req public.appointment_requests; result jsonb; item jsonb; total integer; exact integer;
BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 SELECT * INTO req FROM public.appointment_requests WHERE id=request_id;
 IF req.id IS NULL OR req.status<>'PENDING' THEN RAISE EXCEPTION 'Demande absente ou déjà traitée.' USING ERRCODE='23514'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) INTO result FROM (SELECT id,first_name,last_name,phone,birth_date FROM public.patients WHERE lower(btrim(first_name))=lower(btrim(req.first_name)) AND lower(btrim(last_name))=lower(btrim(req.last_name)) AND phone=req.phone ORDER BY id LIMIT 101) p;
 total:=jsonb_array_length(result);
 SELECT count(*) INTO exact FROM jsonb_array_elements(result) p WHERE (p->>'birth_date')::date=req.birth_date;
 FOR item IN SELECT value FROM jsonb_array_elements(result) LOOP
 INSERT INTO public.patient_read_events(patient_id,actor_user_id,operation) VALUES((item->>'id')::uuid,auth.uid(),'SEARCH');
 END LOOP;
 RETURN jsonb_build_object('status',CASE WHEN total=0 THEN 'NEW' WHEN total>100 THEN 'REVIEW' WHEN exact=1 THEN 'MATCH' WHEN exact>1 THEN 'AMBIGUOUS' ELSE 'REVIEW' END,'patients',result,'birth_date',req.birth_date);
END; $$;
REVOKE ALL ON FUNCTION private.resolve_request_patient(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.resolve_request_patient(uuid) TO authenticated;
CREATE FUNCTION public.resolve_request_patient(request_id uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.resolve_request_patient(request_id); $$;
REVOKE ALL ON FUNCTION public.resolve_request_patient(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_request_patient(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION private.confirm_appointment_request(request_id uuid, selected_patient uuid, selected_resource uuid, selected_service uuid, begins_at timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE req public.appointment_requests; result uuid; mins integer; patient uuid; matches uuid[];
BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 SELECT * INTO req FROM public.appointment_requests WHERE id=request_id FOR UPDATE;
 IF req.id IS NULL OR req.status<>'PENDING' THEN RAISE EXCEPTION 'Demande absente ou déjà traitée.' USING ERRCODE='23514'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(lower(btrim(req.first_name))||'|'||lower(btrim(req.last_name))||'|'||req.birth_date::text||'|'||req.phone,216));
 SELECT array_agg(id ORDER BY id) INTO matches FROM public.patients WHERE lower(btrim(first_name))=lower(btrim(req.first_name)) AND lower(btrim(last_name))=lower(btrim(req.last_name)) AND phone=req.phone AND birth_date=req.birth_date;
 IF selected_patient IS NOT NULL THEN
  IF NOT coalesce(selected_patient=ANY(matches),false) THEN RAISE EXCEPTION 'Vérifier le nom, le téléphone et la naissance du patient.' USING ERRCODE='23514'; END IF;
  patient:=selected_patient;
 ELSIF coalesce(array_length(matches,1),0)=1 THEN patient:=matches[1];
 ELSIF coalesce(array_length(matches,1),0)>1 THEN RAISE EXCEPTION 'Plusieurs fiches compatibles : sélectionnez le patient.' USING ERRCODE='23514';
 ELSE
  IF EXISTS(SELECT 1 FROM public.patients WHERE lower(btrim(first_name))=lower(btrim(req.first_name)) AND lower(btrim(last_name))=lower(btrim(req.last_name)) AND phone=req.phone) THEN RAISE EXCEPTION 'La naissance diffère : vérifier la fiche avant confirmation.' USING ERRCODE='23514'; END IF;
  patient:=private.save_patient_record(NULL,req.first_name,req.last_name,req.birth_date,req.phone);
 END IF;
 INSERT INTO public.patient_read_events(patient_id,actor_user_id,operation) VALUES(patient,auth.uid(),'READ');
 SELECT duration_minutes INTO mins FROM public.care_services WHERE id=selected_service AND is_active;
 IF mins IS NULL OR begins_at IS NULL THEN RAISE EXCEPTION 'Service et début requis.' USING ERRCODE='23514'; END IF;
 INSERT INTO public.agenda_entries(resource_id,kind,patient_id,service_id,starts_at,ends_at) VALUES(selected_resource,'APPOINTMENT',patient,selected_service,begins_at,begins_at+make_interval(mins=>mins)) RETURNING id INTO result;
 UPDATE public.appointment_requests SET status='CONFIRMED',appointment_id=result WHERE id=request_id;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION private.confirm_appointment_request(uuid,uuid,uuid,uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.confirm_appointment_request(uuid,uuid,uuid,uuid,timestamptz) TO authenticated;