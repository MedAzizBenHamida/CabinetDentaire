CREATE TABLE public.patient_read_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
 actor_user_id uuid NOT NULL,
 operation text NOT NULL CHECK (operation IN ('SEARCH','READ')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.patient_read_events TO service_role;
REVOKE ALL ON public.patient_read_events FROM anon, authenticated;
ALTER TABLE public.patient_read_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_reads_no_client_access ON public.patient_read_events FOR ALL TO authenticated USING(false) WITH CHECK(false);
CREATE INDEX patient_read_events_patient_date_idx ON public.patient_read_events(patient_id, created_at);
CREATE INDEX patient_read_events_actor_date_idx ON public.patient_read_events(actor_user_id, created_at);
CREATE TRIGGER patient_reads_updated BEFORE UPDATE ON public.patient_read_events FOR EACH ROW EXECUTE FUNCTION public.staff_set_updated_at();

CREATE FUNCTION private.read_patients_audited(search_text text, selected_patient uuid, page_size integer, page_offset integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 actor uuid := auth.uid();
 result jsonb;
 item jsonb;
 term text := btrim(coalesce(search_text,''));
BEGIN
 IF actor IS NULL OR NOT (private.current_staff_has_role('SUPER_ADMIN') OR private.current_staff_has_role('ADMIN') OR private.current_staff_has_role('ASSISTANTE')) THEN
  RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501';
 END IF;
 IF page_size IS NULL OR page_size < 1 OR page_size > 100 OR page_offset IS NULL OR page_offset < 0 OR length(term)>100 THEN
  RAISE EXCEPTION 'Paramètres de recherche invalides.' USING ERRCODE='22023';
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) INTO result FROM (
  SELECT id, first_name, last_name, birth_date, phone, created_at, updated_at
  FROM public.patients
  WHERE (selected_patient IS NULL OR id=selected_patient)
   AND (term='' OR strpos(lower(first_name),lower(term))>0 OR strpos(lower(last_name),lower(term))>0 OR strpos(phone,term)>0)
  ORDER BY lower(last_name), lower(first_name), id LIMIT page_size OFFSET page_offset
 ) p;
 FOR item IN SELECT value FROM jsonb_array_elements(result) LOOP
  INSERT INTO public.patient_read_events(patient_id, actor_user_id, operation)
  VALUES ((item->>'id')::uuid, actor, CASE WHEN selected_patient IS NULL THEN 'SEARCH' ELSE 'READ' END);
 END LOOP;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION private.read_patients_audited(text,uuid,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.read_patients_audited(text,uuid,integer,integer) TO authenticated;

CREATE FUNCTION public.search_patients(search_text text DEFAULT '', page_size integer DEFAULT 25, page_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
 SELECT private.read_patients_audited(search_text,NULL,page_size,page_offset);
$$;
REVOKE ALL ON FUNCTION public.search_patients(text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_patients(text,integer,integer) TO authenticated;

CREATE FUNCTION public.read_patient(patient_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 IF patient_id IS NULL THEN RAISE EXCEPTION 'Patient requis.' USING ERRCODE='22023'; END IF;
 RETURN private.read_patients_audited('',patient_id,1,0);
END;
$$;
REVOKE ALL ON FUNCTION public.read_patient(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_patient(uuid) TO authenticated;