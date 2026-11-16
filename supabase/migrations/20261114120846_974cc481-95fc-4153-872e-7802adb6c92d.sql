CREATE TABLE public.patients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 first_name text NOT NULL CHECK (length(btrim(first_name)) BETWEEN 1 AND 100),
 last_name text NOT NULL CHECK (length(btrim(last_name)) BETWEEN 1 AND 100),
 birth_date date NOT NULL,
 phone text NOT NULL CHECK (phone ~ '^\+216[0-9]{8}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, UPDATE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
REVOKE ALL ON public.patients FROM anon;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY patients_insert ON public.patients FOR INSERT TO authenticated WITH CHECK (
 private.current_staff_has_role('SUPER_ADMIN') OR private.current_staff_has_role('ADMIN') OR private.current_staff_has_role('ASSISTANTE')
);
CREATE POLICY patients_update ON public.patients FOR UPDATE TO authenticated USING (
 private.current_staff_has_role('SUPER_ADMIN') OR private.current_staff_has_role('ADMIN') OR private.current_staff_has_role('ASSISTANTE')
) WITH CHECK (
 private.current_staff_has_role('SUPER_ADMIN') OR private.current_staff_has_role('ADMIN') OR private.current_staff_has_role('ASSISTANTE')
);
CREATE INDEX patients_phone_idx ON public.patients(phone);
CREATE INDEX patients_identity_idx ON public.patients(lower(last_name), lower(first_name), birth_date);

CREATE TABLE public.patient_change_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
 actor_user_id uuid,
 operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.patient_change_events TO service_role;
REVOKE ALL ON public.patient_change_events FROM anon, authenticated;
ALTER TABLE public.patient_change_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_change_events_no_client_access ON public.patient_change_events FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE INDEX patient_change_events_patient_date_idx ON public.patient_change_events(patient_id, created_at);

CREATE FUNCTION public.validate_patient_birth_date() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.birth_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')::date THEN
 RAISE EXCEPTION 'La date de naissance ne peut pas être future.' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_patient_birth_date() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_patient_birth BEFORE INSERT OR UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.validate_patient_birth_date();
CREATE TRIGGER patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.staff_set_updated_at();
CREATE TRIGGER patient_events_updated BEFORE UPDATE ON public.patient_change_events FOR EACH ROW EXECUTE FUNCTION public.staff_set_updated_at();

CREATE FUNCTION private.record_patient_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.patient_change_events(patient_id, actor_user_id, operation) VALUES (NEW.id, auth.uid(), TG_OP);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.record_patient_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_patient_change AFTER INSERT OR UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION private.record_patient_change();