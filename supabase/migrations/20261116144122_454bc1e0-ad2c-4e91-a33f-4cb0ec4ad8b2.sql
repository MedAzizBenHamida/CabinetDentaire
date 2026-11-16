CREATE FUNCTION private.read_patient_appointments(selected_patient uuid, page_size integer, page_offset integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; item jsonb;
BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 IF selected_patient IS NULL OR page_size IS NULL OR page_size NOT BETWEEN 1 AND 100 OR page_offset IS NULL OR page_offset<0 THEN RAISE EXCEPTION 'Pagination invalide.' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) INTO result FROM (
 SELECT e.id,e.patient_id,e.kind,e.starts_at,e.ends_at,e.is_cancelled,s.name AS service_name,r.name AS resource_name
 FROM public.agenda_entries e LEFT JOIN public.care_services s ON s.id=e.service_id LEFT JOIN public.care_resources r ON r.id=e.resource_id
 WHERE e.patient_id=selected_patient AND e.kind='APPOINTMENT' AND e.ends_at<=statement_timestamp()
 ORDER BY e.starts_at DESC,e.id DESC LIMIT page_size OFFSET page_offset
 ) a;
 INSERT INTO public.patient_read_events(patient_id,actor_user_id,operation) VALUES(selected_patient,auth.uid(),'READ');
 FOR item IN SELECT value FROM jsonb_array_elements(result) LOOP
 INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(auth.uid(),'READ','agenda_entries',(item->>'id')::uuid);
 END LOOP;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION private.read_patient_appointments(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.read_patient_appointments(uuid,integer,integer) TO authenticated;
CREATE FUNCTION public.read_patient_appointments(selected_patient uuid,page_size integer DEFAULT 25,page_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.read_patient_appointments(selected_patient,page_size,page_offset); $$;
REVOKE ALL ON FUNCTION public.read_patient_appointments(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_patient_appointments(uuid,integer,integer) TO authenticated;