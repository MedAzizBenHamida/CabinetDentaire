ALTER TABLE public.appointment_requests ADD COLUMN desired_care text;

DROP FUNCTION public.submit_appointment_request(text, text, text, date, text, date);
CREATE FUNCTION public.submit_appointment_request(given_name text, family_name text, tunisian_phone text, requested_date date, requested_period text, birth_date date, requested_care text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE result uuid;
BEGIN
  IF requested_care IS NOT NULL AND (length(btrim(requested_care)) = 0 OR length(btrim(requested_care)) > 100) THEN
    RAISE EXCEPTION 'Soin invalide.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.appointment_requests(first_name, last_name, phone, desired_date, desired_period, birth_date, desired_care)
  VALUES (btrim(given_name), btrim(family_name), tunisian_phone, requested_date, requested_period, birth_date, NULLIF(btrim(requested_care), ''))
  RETURNING id INTO result;
  RETURN result;
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_appointment_request(text, text, text, date, text, date, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_appointment_request(text, text, text, date, text, date, text) TO service_role;

CREATE OR REPLACE FUNCTION private.available_request_days(days_ahead integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE result jsonb; first_day date;
BEGIN
  IF days_ahead IS NULL OR days_ahead NOT BETWEEN 1 AND 45 THEN
    RAISE EXCEPTION 'Fenêtre invalide.' USING ERRCODE = '22023';
  END IF;
  first_day := (now() AT TIME ZONE 'Africa/Tunis')::date;
  SELECT coalesce(jsonb_agg(day ORDER BY day), '[]'::jsonb) INTO result
  FROM (
    SELECT d.day::date AS day
    FROM generate_series(first_day, first_day + days_ahead - 1, interval '1 day') d(day)
    WHERE EXISTS (
      SELECT 1
      FROM (VALUES ('MORNING', time '08:00', time '13:00'), ('AFTERNOON', time '15:00', time '17:00')) p(period, begins, finishes)
      WHERE EXISTS (
        SELECT 1
        FROM public.opening_intervals o
        JOIN public.care_resources r ON r.id = o.resource_id
        WHERE r.is_active
          AND o.weekday = extract(dow FROM d.day)::integer
          AND o.opens_at < p.finishes
          AND o.closes_at > p.begins
          AND NOT EXISTS (
            SELECT 1 FROM public.exceptional_closures c
            WHERE c.resource_id = r.id AND c.closed_on = d.day::date
          )
      )
    )
  ) v;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.available_request_days(days_ahead integer)
RETURNS jsonb
LANGUAGE sql
SET search_path TO ''
AS $function$ SELECT private.available_request_days(days_ahead); $function$;
REVOKE ALL ON FUNCTION public.available_request_days(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.available_request_days(integer) TO anon, authenticated;