CREATE TABLE private.public_request_limits (bucket text PRIMARY KEY, window_started_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON private.public_request_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.public_request_limits TO service_role;
ALTER TABLE private.public_request_limits ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION private.consume_public_request_limit(bucket_key text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE n integer; BEGIN
 IF coalesce(auth.role(),'')<>'service_role' OR bucket_key IS NULL OR bucket_key !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Accès refusé.' USING ERRCODE='42501'; END IF;
 INSERT INTO private.public_request_limits(bucket,window_started_at,attempts) VALUES(bucket_key,now(),1) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN private.public_request_limits.window_started_at<=now()-interval '10 minutes' THEN 1 ELSE private.public_request_limits.attempts+1 END,window_started_at=CASE WHEN private.public_request_limits.window_started_at<=now()-interval '10 minutes' THEN now() ELSE private.public_request_limits.window_started_at END,updated_at=now() RETURNING attempts INTO n;
 RETURN n<=5;
 END; $$;
REVOKE ALL ON FUNCTION private.consume_public_request_limit(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.consume_public_request_limit(text) TO service_role;
CREATE FUNCTION public.consume_public_request_limit(bucket_key text) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.consume_public_request_limit(bucket_key); $$;
REVOKE ALL ON FUNCTION public.consume_public_request_limit(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_request_limit(text) TO service_role;