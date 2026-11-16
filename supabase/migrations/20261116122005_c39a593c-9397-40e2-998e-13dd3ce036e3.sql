ALTER TABLE public.appointment_requests
  ADD COLUMN birth_date date NOT NULL,
  ADD CONSTRAINT appointment_requests_birth_date_not_future CHECK (birth_date <= (now() AT TIME ZONE 'Africa/Tunis')::date);

DROP FUNCTION public.submit_appointment_request(text, text, text, date, text);

CREATE FUNCTION public.submit_appointment_request(given_name text, family_name text, tunisian_phone text, requested_date date, requested_period text, birth_date date)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE result uuid;
BEGIN
  INSERT INTO public.appointment_requests(first_name, last_name, phone, desired_date, desired_period, birth_date)
  VALUES (btrim(given_name), btrim(family_name), tunisian_phone, requested_date, requested_period, birth_date)
  RETURNING id INTO result;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_appointment_request(text, text, text, date, text, date) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_appointment_request(text, text, text, date, text, date) TO service_role;