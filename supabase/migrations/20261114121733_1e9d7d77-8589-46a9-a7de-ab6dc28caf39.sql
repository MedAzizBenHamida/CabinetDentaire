CREATE FUNCTION private.staff_can_work() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT private.current_staff_has_role('SUPER_ADMIN') OR private.current_staff_has_role('ADMIN') OR private.current_staff_has_role('ASSISTANTE'); $$;
REVOKE ALL ON FUNCTION private.staff_can_work() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.staff_can_work() TO authenticated, service_role;

CREATE TABLE public.care_resources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.care_resources TO authenticated; GRANT ALL ON public.care_resources TO service_role;
ALTER TABLE public.care_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY resource_read ON public.care_resources FOR SELECT TO authenticated USING(private.staff_can_work());
INSERT INTO public.care_resources(id,name) VALUES ('00000000-0000-4000-8000-000000000001','Fauteuil 1 — espace de soins');

CREATE TABLE public.care_services (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, duration_minutes integer NOT NULL, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.care_services TO authenticated; GRANT ALL ON public.care_services TO service_role;
ALTER TABLE public.care_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_read ON public.care_services FOR SELECT TO authenticated USING(private.staff_can_work());

CREATE TABLE public.opening_intervals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_id uuid NOT NULL REFERENCES public.care_resources(id), weekday integer NOT NULL, opens_at time NOT NULL, closes_at time NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.opening_intervals TO authenticated; GRANT ALL ON public.opening_intervals TO service_role;
ALTER TABLE public.opening_intervals ENABLE ROW LEVEL SECURITY;
CREATE POLICY opening_read ON public.opening_intervals FOR SELECT TO authenticated USING(private.staff_can_work());
CREATE INDEX opening_resource_day ON public.opening_intervals(resource_id,weekday);

CREATE TABLE public.exceptional_closures (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_id uuid NOT NULL REFERENCES public.care_resources(id), closed_on date NOT NULL, reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(resource_id,closed_on));
GRANT SELECT ON public.exceptional_closures TO authenticated; GRANT ALL ON public.exceptional_closures TO service_role;
ALTER TABLE public.exceptional_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY closure_read ON public.exceptional_closures FOR SELECT TO authenticated USING(private.staff_can_work());

CREATE TABLE public.professional_authorizations (user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE, is_verified_dentist boolean NOT NULL DEFAULT false, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.professional_authorizations TO authenticated; GRANT ALL ON public.professional_authorizations TO service_role;
ALTER TABLE public.professional_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY qualification_read ON public.professional_authorizations FOR SELECT TO authenticated USING(private.staff_can_work() AND (user_id=auth.uid() OR private.current_staff_has_role('SUPER_ADMIN')));

CREATE TABLE public.cabinet_audit_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, operation text NOT NULL, entity_type text NOT NULL, entity_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.cabinet_audit_events TO service_role;
ALTER TABLE public.cabinet_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_no_client ON public.cabinet_audit_events FOR ALL TO authenticated USING(false) WITH CHECK(false);
CREATE INDEX cabinet_audit_entity ON public.cabinet_audit_events(entity_type,entity_id,created_at);

CREATE TABLE public.agenda_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_id uuid NOT NULL REFERENCES public.care_resources(id), kind text NOT NULL, patient_id uuid REFERENCES public.patients(id), service_id uuid REFERENCES public.care_services(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, internal_reason text NOT NULL DEFAULT '', is_cancelled boolean NOT NULL DEFAULT false, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT INSERT, UPDATE ON public.agenda_entries TO authenticated; GRANT ALL ON public.agenda_entries TO service_role;
ALTER TABLE public.agenda_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY agenda_insert ON public.agenda_entries FOR INSERT TO authenticated WITH CHECK(private.staff_can_work());
CREATE POLICY agenda_update ON public.agenda_entries FOR UPDATE TO authenticated USING(private.staff_can_work()) WITH CHECK(private.staff_can_work());
CREATE INDEX agenda_resource_time ON public.agenda_entries(resource_id,starts_at,ends_at) WHERE NOT is_cancelled;
CREATE INDEX agenda_patient ON public.agenda_entries(patient_id);

CREATE TABLE public.appointment_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), first_name text NOT NULL, last_name text NOT NULL, phone text NOT NULL, desired_date date NOT NULL, desired_period text NOT NULL, status text NOT NULL DEFAULT 'PENDING', appointment_id uuid UNIQUE REFERENCES public.agenda_entries(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.appointment_requests TO service_role;
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY requests_no_direct ON public.appointment_requests FOR ALL TO authenticated USING(false) WITH CHECK(false);
CREATE UNIQUE INDEX pending_request_duplicate ON public.appointment_requests(phone,desired_date,desired_period) WHERE status='PENDING';
CREATE INDEX request_queue ON public.appointment_requests(status,created_at);

CREATE TABLE public.medical_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id uuid NOT NULL REFERENCES public.patients(id), content text NOT NULL, revision integer NOT NULL DEFAULT 1, created_by uuid NOT NULL, edited_by uuid NOT NULL, finalized_by uuid, finalized_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.medical_notes TO service_role;
ALTER TABLE public.medical_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY notes_no_direct ON public.medical_notes FOR ALL TO authenticated USING(false) WITH CHECK(false);
CREATE INDEX note_patient ON public.medical_notes(patient_id,created_at);

CREATE TABLE public.medical_note_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), note_id uuid NOT NULL REFERENCES public.medical_notes(id), revision integer NOT NULL, content text NOT NULL, edited_by uuid NOT NULL, finalized_by uuid, finalized_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(note_id,revision));
GRANT SELECT, INSERT ON public.medical_note_versions TO service_role;
ALTER TABLE public.medical_note_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY versions_no_direct ON public.medical_note_versions FOR ALL TO authenticated USING(false) WITH CHECK(false);

CREATE FUNCTION private.verified_dentist() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT private.staff_can_work() AND EXISTS(SELECT 1 FROM public.professional_authorizations WHERE user_id=auth.uid() AND is_verified_dentist AND verified_at IS NOT NULL); $$;
REVOKE ALL ON FUNCTION private.verified_dentist() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION private.verified_dentist() TO authenticated,service_role;

CREATE FUNCTION private.log_cabinet_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(auth.uid(),TG_OP,TG_TABLE_NAME,CASE WHEN TG_TABLE_NAME='professional_authorizations' THEN NEW.user_id ELSE NEW.id END); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.log_cabinet_change() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.validate_configuration() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE rid uuid; BEGIN
 IF TG_TABLE_NAME='care_services' THEN
  IF length(btrim(NEW.name)) NOT BETWEEN 1 AND 100 OR NEW.duration_minutes NOT BETWEEN 1 AND 1440 THEN RAISE EXCEPTION 'Service ou durée invalide.' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='care_resources' THEN
  IF length(btrim(NEW.name)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Ressource invalide.' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='opening_intervals' THEN
  IF NEW.weekday NOT BETWEEN 0 AND 6 OR NEW.opens_at>=NEW.closes_at THEN RAISE EXCEPTION 'Horaires invalides.' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND OLD.resource_id<>NEW.resource_id THEN RAISE EXCEPTION 'Ressource immuable.'; END IF;
  rid:=NEW.resource_id; PERFORM 1 FROM public.care_resources WHERE id=rid FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.opening_intervals o WHERE o.resource_id=rid AND o.weekday=NEW.weekday AND o.id<>NEW.id AND o.opens_at<NEW.closes_at AND NEW.opens_at<o.closes_at) THEN RAISE EXCEPTION 'Plages horaires en conflit.' USING ERRCODE='23P01'; END IF;
 ELSIF TG_TABLE_NAME='exceptional_closures' THEN
  IF length(NEW.reason)>1000 THEN RAISE EXCEPTION 'Motif trop long.' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND OLD.resource_id<>NEW.resource_id THEN RAISE EXCEPTION 'Ressource immuable.'; END IF;
  PERFORM 1 FROM public.care_resources WHERE id=NEW.resource_id FOR UPDATE;
 ELSIF TG_TABLE_NAME='professional_authorizations' THEN
  IF NEW.is_verified_dentist AND NEW.verified_at IS NULL THEN RAISE EXCEPTION 'Vérification professionnelle requise.' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.validate_configuration() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.appointment_is_open(rid uuid, begins timestamptz, finishes timestamptz) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT (begins AT TIME ZONE 'Africa/Tunis')::date=(finishes AT TIME ZONE 'Africa/Tunis')::date
 AND EXISTS(SELECT 1 FROM public.care_resources WHERE id=rid AND is_active)
 AND NOT EXISTS(SELECT 1 FROM public.exceptional_closures WHERE resource_id=rid AND closed_on=(begins AT TIME ZONE 'Africa/Tunis')::date)
 AND EXISTS(SELECT 1 FROM public.opening_intervals WHERE resource_id=rid AND weekday=extract(dow FROM begins AT TIME ZONE 'Africa/Tunis')::integer AND opens_at<=(begins AT TIME ZONE 'Africa/Tunis')::time AND closes_at>=(finishes AT TIME ZONE 'Africa/Tunis')::time);
$$;
REVOKE ALL ON FUNCTION private.appointment_is_open(uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.validate_agenda() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE mins integer; BEGIN
 IF TG_OP='UPDATE' AND (NEW.resource_id<>OLD.resource_id OR NEW.kind<>OLD.kind OR NEW.created_by IS DISTINCT FROM OLD.created_by) THEN RAISE EXCEPTION 'Ressource, type et auteur immuables.' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.care_resources WHERE id=NEW.resource_id FOR UPDATE;
 IF NEW.starts_at>=NEW.ends_at OR NOT isfinite(NEW.starts_at) OR NOT isfinite(NEW.ends_at) OR length(NEW.internal_reason)>2000 OR NEW.kind NOT IN('APPOINTMENT','BLOCK') THEN RAISE EXCEPTION 'Réservation invalide.' USING ERRCODE='23514'; END IF;
 IF NEW.kind='APPOINTMENT' THEN
  IF NEW.patient_id IS NULL OR NEW.service_id IS NULL THEN RAISE EXCEPTION 'Patient et service requis.' USING ERRCODE='23514'; END IF;
  SELECT duration_minutes INTO mins FROM public.care_services WHERE id=NEW.service_id AND is_active;
  IF NOT NEW.is_cancelled AND (mins IS NULL OR NEW.ends_at-NEW.starts_at<>make_interval(mins=>mins) OR NOT private.appointment_is_open(NEW.resource_id,NEW.starts_at,NEW.ends_at)) THEN RAISE EXCEPTION 'Durée ou disponibilité invalide.' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW.patient_id IS NOT NULL OR NEW.service_id IS NOT NULL THEN RAISE EXCEPTION 'Un blocage ne contient pas de patient ni de service.' USING ERRCODE='23514'; END IF;
 END IF;
 IF NOT NEW.is_cancelled AND EXISTS(SELECT 1 FROM public.agenda_entries WHERE resource_id=NEW.resource_id AND id<>NEW.id AND NOT is_cancelled AND starts_at<NEW.ends_at AND NEW.starts_at<ends_at) THEN RAISE EXCEPTION 'Chevauchement de réservation.' USING ERRCODE='23P01'; END IF;
 IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); END IF;
 RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.validate_agenda() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_agenda BEFORE INSERT OR UPDATE ON public.agenda_entries FOR EACH ROW EXECUTE FUNCTION private.validate_agenda();

CREATE FUNCTION private.recheck_schedule() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE rid uuid; BEGIN
 rid:=CASE WHEN TG_OP='DELETE' THEN OLD.resource_id ELSE NEW.resource_id END;
 PERFORM 1 FROM public.care_resources WHERE id=rid FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.agenda_entries a WHERE a.resource_id=rid AND a.kind='APPOINTMENT' AND NOT a.is_cancelled AND a.ends_at>now() AND NOT private.appointment_is_open(rid,a.starts_at,a.ends_at)) THEN RAISE EXCEPTION 'Les horaires rendent un rendez-vous existant indisponible.' USING ERRCODE='23514'; END IF;
 RETURN NULL; END; $$;
REVOKE ALL ON FUNCTION private.recheck_schedule() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER schedule_openings AFTER INSERT OR UPDATE OR DELETE ON public.opening_intervals FOR EACH ROW EXECUTE FUNCTION private.recheck_schedule();
CREATE TRIGGER schedule_closures AFTER INSERT OR UPDATE OR DELETE ON public.exceptional_closures FOR EACH ROW EXECUTE FUNCTION private.recheck_schedule();

CREATE FUNCTION private.validate_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.agenda_entries; BEGIN
 IF length(btrim(NEW.first_name)) NOT BETWEEN 1 AND 100 OR length(btrim(NEW.last_name)) NOT BETWEEN 1 AND 100 OR NEW.phone!~'^\+216[0-9]{8}$' OR NEW.desired_period NOT IN('MORNING','AFTERNOON') OR NOT isfinite(NEW.desired_date) THEN RAISE EXCEPTION 'Demande invalide.' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'PENDING' OR NEW.appointment_id IS NOT NULL OR NEW.desired_date<(now() AT TIME ZONE 'Africa/Tunis')::date THEN RAISE EXCEPTION 'La demande doit commencer en attente.' USING ERRCODE='23514'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.opening_intervals o JOIN public.care_resources r ON r.id=o.resource_id WHERE r.is_active AND o.weekday=extract(dow FROM NEW.desired_date)::integer AND NOT EXISTS(SELECT 1 FROM public.exceptional_closures c WHERE c.resource_id=r.id AND c.closed_on=NEW.desired_date) AND o.opens_at<CASE NEW.desired_period WHEN 'MORNING' THEN time '13:00' ELSE time '17:00' END AND o.closes_at>CASE NEW.desired_period WHEN 'MORNING' THEN time '08:00' ELSE time '15:00' END) THEN RAISE EXCEPTION 'Période non ouverte.' USING ERRCODE='23514'; END IF;
 ELSE
  IF OLD.status<>'PENDING' OR NEW.status<>'CONFIRMED' OR NEW.first_name<>OLD.first_name OR NEW.last_name<>OLD.last_name OR NEW.phone<>OLD.phone OR NEW.desired_date<>OLD.desired_date OR NEW.desired_period<>OLD.desired_period THEN RAISE EXCEPTION 'Transition de demande non autorisée.' USING ERRCODE='23514'; END IF;
  SELECT * INTO a FROM public.agenda_entries WHERE id=NEW.appointment_id;
  IF a.id IS NULL OR a.kind<>'APPOINTMENT' OR a.is_cancelled THEN RAISE EXCEPTION 'Rendez-vous valide requis.' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.validate_request() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_request BEFORE INSERT OR UPDATE ON public.appointment_requests FOR EACH ROW EXECUTE FUNCTION private.validate_request();

CREATE FUNCTION private.validate_note() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Personnel actif requis.' USING ERRCODE='42501'; END IF;
 IF length(btrim(NEW.content)) NOT BETWEEN 1 AND 20000 THEN RAISE EXCEPTION 'Note invalide.' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.finalized_at IS NOT NULL OR NEW.finalized_by IS NOT NULL THEN RAISE EXCEPTION 'Créer un brouillon avant finalisation.' USING ERRCODE='23514'; END IF;
  NEW.created_by:=auth.uid(); NEW.edited_by:=auth.uid(); NEW.revision:=1;
 ELSE
  IF OLD.finalized_at IS NOT NULL THEN RAISE EXCEPTION 'Note finalisée immuable.' USING ERRCODE='42501'; END IF;
  IF NEW.patient_id<>OLD.patient_id OR NEW.created_by<>OLD.created_by THEN RAISE EXCEPTION 'Patient et auteur immuables.' USING ERRCODE='23514'; END IF;
  NEW.revision:=OLD.revision+1; NEW.edited_by:=auth.uid();
  IF NEW.finalized_at IS NOT NULL THEN
   IF NOT private.verified_dentist() THEN RAISE EXCEPTION 'Finalisation réservée au dentiste habilité.' USING ERRCODE='42501'; END IF;
   NEW.finalized_at:=now(); NEW.finalized_by:=auth.uid();
  ELSIF NEW.finalized_by IS NOT NULL THEN RAISE EXCEPTION 'Finalisation invalide.' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.validate_note() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_note BEFORE INSERT OR UPDATE ON public.medical_notes FOR EACH ROW EXECUTE FUNCTION private.validate_note();
CREATE FUNCTION private.record_note_version() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN INSERT INTO public.medical_note_versions(note_id,revision,content,edited_by,finalized_by,finalized_at) VALUES(NEW.id,NEW.revision,NEW.content,NEW.edited_by,NEW.finalized_by,NEW.finalized_at); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.record_note_version() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER note_version AFTER INSERT OR UPDATE ON public.medical_notes FOR EACH ROW EXECUTE FUNCTION private.record_note_version();
CREATE FUNCTION private.reject_history_change() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'Historique immuable.' USING ERRCODE='42501'; END; $$;
REVOKE ALL ON FUNCTION private.reject_history_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER history_immutable BEFORE UPDATE OR DELETE ON public.medical_note_versions FOR EACH ROW EXECUTE FUNCTION private.reject_history_change();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON public.cabinet_audit_events FOR EACH ROW EXECUTE FUNCTION private.reject_history_change();

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['care_resources','care_services','opening_intervals','exceptional_closures','professional_authorizations','agenda_entries','appointment_requests','medical_notes'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.staff_set_updated_at()',t||'_updated',t);
  EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.log_cabinet_change()',t||'_audit',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['care_resources','care_services','opening_intervals','exceptional_closures','professional_authorizations'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.validate_configuration()',t||'_validate',t);
 END LOOP;
END; $$;

CREATE FUNCTION public.submit_appointment_request(given_name text, family_name text, tunisian_phone text, requested_date date, requested_period text) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ DECLARE result uuid; BEGIN INSERT INTO public.appointment_requests(first_name,last_name,phone,desired_date,desired_period) VALUES(btrim(given_name),btrim(family_name),tunisian_phone,requested_date,requested_period) RETURNING id INTO result; RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.submit_appointment_request(text,text,text,date,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.submit_appointment_request(text,text,text,date,text) TO service_role;

CREATE FUNCTION public.confirm_appointment_request(request_id uuid, selected_patient uuid, selected_resource uuid, selected_service uuid, begins_at timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE req public.appointment_requests; result uuid; mins integer; patient_phone text; BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 SELECT * INTO req FROM public.appointment_requests WHERE id=request_id FOR UPDATE;
 IF req.id IS NULL OR req.status<>'PENDING' THEN RAISE EXCEPTION 'Demande absente ou déjà traitée.' USING ERRCODE='23514'; END IF;
 SELECT phone INTO patient_phone FROM public.patients WHERE id=selected_patient;
 IF patient_phone IS NULL OR patient_phone<>req.phone THEN RAISE EXCEPTION 'Vérifier l’association du patient et du téléphone.' USING ERRCODE='23514'; END IF;
 SELECT duration_minutes INTO mins FROM public.care_services WHERE id=selected_service AND is_active;
 IF mins IS NULL OR begins_at IS NULL THEN RAISE EXCEPTION 'Service et début requis.' USING ERRCODE='23514'; END IF;
 INSERT INTO public.agenda_entries(resource_id,kind,patient_id,service_id,starts_at,ends_at) VALUES(selected_resource,'APPOINTMENT',selected_patient,selected_service,begins_at,begins_at+make_interval(mins=>mins)) RETURNING id INTO result;
 UPDATE public.appointment_requests SET status='CONFIRMED',appointment_id=result WHERE id=request_id;
 RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.confirm_appointment_request(uuid,uuid,uuid,uuid,timestamptz) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.confirm_appointment_request(uuid,uuid,uuid,uuid,timestamptz) TO authenticated;

CREATE FUNCTION public.save_agenda_entry(entry_id uuid, selected_resource uuid, entry_kind text, selected_patient uuid, selected_service uuid, begins_at timestamptz, finishes_at timestamptz, reason text DEFAULT '', cancelled boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result uuid; BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 IF entry_id IS NULL THEN INSERT INTO public.agenda_entries(resource_id,kind,patient_id,service_id,starts_at,ends_at,internal_reason,is_cancelled) VALUES(selected_resource,entry_kind,selected_patient,selected_service,begins_at,finishes_at,reason,cancelled) RETURNING id INTO result;
 ELSE UPDATE public.agenda_entries SET resource_id=selected_resource,kind=entry_kind,patient_id=selected_patient,service_id=selected_service,starts_at=begins_at,ends_at=finishes_at,internal_reason=reason,is_cancelled=cancelled WHERE id=entry_id RETURNING id INTO result; END IF;
 IF result IS NULL THEN RAISE EXCEPTION 'Réservation introuvable.' USING ERRCODE='22023'; END IF; RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.save_agenda_entry(uuid,uuid,text,uuid,uuid,timestamptz,timestamptz,text,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_agenda_entry(uuid,uuid,text,uuid,uuid,timestamptz,timestamptz,text,boolean) TO authenticated;
REVOKE INSERT,UPDATE ON public.agenda_entries FROM authenticated;

CREATE FUNCTION public.save_medical_note(note_id uuid, selected_patient uuid, note_content text, expected_revision integer DEFAULT NULL, finalize boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result uuid; BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 IF note_id IS NULL THEN
  IF finalize THEN RAISE EXCEPTION 'Créer un brouillon avant finalisation.' USING ERRCODE='23514'; END IF;
  INSERT INTO public.medical_notes(patient_id,content,created_by,edited_by) VALUES(selected_patient,note_content,auth.uid(),auth.uid()) RETURNING id INTO result;
 ELSE
  UPDATE public.medical_notes SET content=note_content,finalized_at=CASE WHEN finalize THEN now() ELSE NULL END WHERE id=note_id AND patient_id=selected_patient AND revision=expected_revision RETURNING id INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'Note introuvable ou révision concurrente.' USING ERRCODE='40001'; END IF;
 END IF; RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.save_medical_note(uuid,uuid,text,integer,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_medical_note(uuid,uuid,text,integer,boolean) TO authenticated;

CREATE FUNCTION public.read_medical_notes(selected_patient uuid, page_size integer DEFAULT 25, page_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; item jsonb; BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 IF selected_patient IS NULL OR page_size IS NULL OR page_size NOT BETWEEN 1 AND 100 OR page_offset IS NULL OR page_offset<0 THEN RAISE EXCEPTION 'Pagination invalide.' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(n)),'[]'::jsonb) INTO result FROM(SELECT * FROM public.medical_notes WHERE patient_id=selected_patient ORDER BY created_at DESC,id LIMIT page_size OFFSET page_offset)n;
 FOR item IN SELECT value FROM jsonb_array_elements(result) LOOP INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(auth.uid(),'READ','medical_notes',(item->>'id')::uuid); END LOOP; RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.read_medical_notes(uuid,integer,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.read_medical_notes(uuid,integer,integer) TO authenticated;

CREATE FUNCTION public.read_medical_note_history(selected_note uuid, page_size integer DEFAULT 25, page_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 IF selected_note IS NULL OR page_size IS NULL OR page_size NOT BETWEEN 1 AND 100 OR page_offset IS NULL OR page_offset<0 THEN RAISE EXCEPTION 'Pagination invalide.' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) INTO result FROM(SELECT * FROM public.medical_note_versions WHERE note_id=selected_note ORDER BY revision DESC LIMIT page_size OFFSET page_offset)v;
 INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(auth.uid(),'READ_HISTORY','medical_notes',selected_note); RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.read_medical_note_history(uuid,integer,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.read_medical_note_history(uuid,integer,integer) TO authenticated;

CREATE FUNCTION public.read_agenda(window_start timestamptz, window_end timestamptz, page_size integer DEFAULT 100, page_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; item jsonb; BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 IF window_start IS NULL OR window_end IS NULL OR NOT isfinite(window_start) OR NOT isfinite(window_end) OR window_start>=window_end OR window_end-window_start>interval '62 days' OR page_size IS NULL OR page_size NOT BETWEEN 1 AND 100 OR page_offset IS NULL OR page_offset<0 THEN RAISE EXCEPTION 'Fenêtre ou pagination invalide.' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) INTO result FROM(SELECT * FROM public.agenda_entries WHERE starts_at<window_end AND ends_at>window_start ORDER BY starts_at,id LIMIT page_size OFFSET page_offset)a;
 FOR item IN SELECT value FROM jsonb_array_elements(result) LOOP INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(auth.uid(),'READ','agenda_entries',(item->>'id')::uuid); END LOOP; RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.read_agenda(timestamptz,timestamptz,integer,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.read_agenda(timestamptz,timestamptz,integer,integer) TO authenticated;

CREATE FUNCTION public.read_appointment_requests(page_size integer DEFAULT 25, page_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result jsonb; item jsonb; BEGIN
 IF NOT private.staff_can_work() THEN RAISE EXCEPTION 'Accès non autorisé.' USING ERRCODE='42501'; END IF;
 IF page_size IS NULL OR page_size NOT BETWEEN 1 AND 100 OR page_offset IS NULL OR page_offset<0 THEN RAISE EXCEPTION 'Pagination invalide.' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) INTO result FROM(SELECT * FROM public.appointment_requests ORDER BY created_at,id LIMIT page_size OFFSET page_offset)r;
 FOR item IN SELECT value FROM jsonb_array_elements(result) LOOP INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(auth.uid(),'READ','appointment_requests',(item->>'id')::uuid); END LOOP; RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.read_appointment_requests(integer,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.read_appointment_requests(integer,integer) TO authenticated;

CREATE FUNCTION public.manage_staff_account(target_user uuid, active boolean, assigned_role public.app_role, display_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(714216001);
 IF NOT private.current_staff_has_role('SUPER_ADMIN') THEN RAISE EXCEPTION 'Super administrateur requis.' USING ERRCODE='42501'; END IF;
 IF target_user IS NULL OR active IS NULL OR assigned_role IS NULL OR display_name IS NULL OR length(btrim(display_name)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Compte invalide.' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.staff_accounts WHERE user_id=target_user) THEN RAISE EXCEPTION 'Compte introuvable.' USING ERRCODE='22023'; END IF;
 IF (NOT active OR assigned_role<>'SUPER_ADMIN') AND EXISTS(SELECT 1 FROM public.staff_accounts s JOIN public.user_roles r USING(user_id) WHERE s.user_id=target_user AND s.is_active AND r.role='SUPER_ADMIN') AND NOT EXISTS(SELECT 1 FROM public.staff_accounts s JOIN public.user_roles r USING(user_id) WHERE s.user_id<>target_user AND s.is_active AND r.role='SUPER_ADMIN') THEN RAISE EXCEPTION 'Conserver un super administrateur actif.' USING ERRCODE='23514'; END IF;
 UPDATE public.profiles SET display_name=btrim(manage_staff_account.display_name) WHERE user_id=target_user;
 UPDATE public.staff_accounts SET is_active=active WHERE user_id=target_user;
 INSERT INTO public.user_roles(user_id,role) VALUES(target_user,assigned_role) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role;
 INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(auth.uid(),'MANAGE_STAFF','staff_accounts',target_user);
 END; $$;
REVOKE ALL ON FUNCTION public.manage_staff_account(uuid,boolean,public.app_role,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.manage_staff_account(uuid,boolean,public.app_role,text) TO authenticated;

CREATE FUNCTION public.save_care_service(service_id uuid, service_name text, minutes integer, active boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result uuid; BEGIN
 IF NOT(private.current_staff_has_role('SUPER_ADMIN') OR private.current_staff_has_role('ADMIN')) THEN RAISE EXCEPTION 'Administrateur requis.' USING ERRCODE='42501'; END IF;
 IF service_id IS NULL THEN INSERT INTO public.care_services(name,duration_minutes,is_active) VALUES(btrim(service_name),minutes,active) RETURNING id INTO result;
 ELSE UPDATE public.care_services SET name=btrim(service_name),duration_minutes=minutes,is_active=active WHERE id=service_id RETURNING id INTO result; END IF;
 IF result IS NULL THEN RAISE EXCEPTION 'Service introuvable.' USING ERRCODE='22023'; END IF; RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.save_care_service(uuid,text,integer,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_care_service(uuid,text,integer,boolean) TO authenticated;

CREATE FUNCTION public.save_opening_interval(interval_id uuid, selected_resource uuid, day_of_week integer, opening_time time, closing_time time) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result uuid; BEGIN
 IF NOT(private.current_staff_has_role('SUPER_ADMIN') OR private.current_staff_has_role('ADMIN')) THEN RAISE EXCEPTION 'Administrateur requis.' USING ERRCODE='42501'; END IF;
 IF interval_id IS NULL THEN INSERT INTO public.opening_intervals(resource_id,weekday,opens_at,closes_at) VALUES(selected_resource,day_of_week,opening_time,closing_time) RETURNING id INTO result;
 ELSE UPDATE public.opening_intervals SET resource_id=selected_resource,weekday=day_of_week,opens_at=opening_time,closes_at=closing_time WHERE id=interval_id RETURNING id INTO result; END IF;
 IF result IS NULL THEN RAISE EXCEPTION 'Plage introuvable.' USING ERRCODE='22023'; END IF; RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.save_opening_interval(uuid,uuid,integer,time,time) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_opening_interval(uuid,uuid,integer,time,time) TO authenticated;

CREATE FUNCTION public.save_exceptional_closure(closure_id uuid, selected_resource uuid, closed_date date, closure_reason text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE result uuid; BEGIN
 IF NOT(private.current_staff_has_role('SUPER_ADMIN') OR private.current_staff_has_role('ADMIN')) THEN RAISE EXCEPTION 'Administrateur requis.' USING ERRCODE='42501'; END IF;
 IF closure_id IS NULL THEN INSERT INTO public.exceptional_closures(resource_id,closed_on,reason) VALUES(selected_resource,closed_date,closure_reason) RETURNING id INTO result;
 ELSE UPDATE public.exceptional_closures SET resource_id=selected_resource,closed_on=closed_date,reason=closure_reason WHERE id=closure_id RETURNING id INTO result; END IF;
 IF result IS NULL THEN RAISE EXCEPTION 'Fermeture introuvable.' USING ERRCODE='22023'; END IF; RETURN result; END; $$;
REVOKE ALL ON FUNCTION public.save_exceptional_closure(uuid,uuid,date,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_exceptional_closure(uuid,uuid,date,text) TO authenticated;