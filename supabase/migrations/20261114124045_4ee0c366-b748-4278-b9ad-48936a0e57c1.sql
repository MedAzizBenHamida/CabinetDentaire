DO $$
DECLARE target uuid; account_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(714216001);
 SELECT count(*) INTO account_count FROM auth.users;
 IF account_count <> 1 THEN RAISE EXCEPTION 'Activation annulée : un compte unique est requis.'; END IF;
 SELECT id INTO target FROM auth.users WHERE email_confirmed_at IS NOT NULL;
 IF target IS NULL THEN RAISE EXCEPTION 'Activation annulée : adresse e-mail non confirmée.'; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_accounts s JOIN public.user_roles r USING(user_id) WHERE s.is_active AND r.role='SUPER_ADMIN') THEN RAISE EXCEPTION 'Activation annulée : un super administrateur actif existe déjà.'; END IF;
 INSERT INTO public.profiles(user_id) VALUES(target) ON CONFLICT(user_id) DO NOTHING;
 INSERT INTO public.staff_accounts(user_id,is_active) VALUES(target,true) ON CONFLICT(user_id) DO UPDATE SET is_active=true;
 INSERT INTO public.user_roles(user_id,role) VALUES(target,'SUPER_ADMIN') ON CONFLICT(user_id) DO UPDATE SET role='SUPER_ADMIN';
 INSERT INTO public.cabinet_audit_events(actor_user_id,operation,entity_type,entity_id) VALUES(NULL,'OWNER_APPROVED_FIRST_SUPER_ADMIN','staff_accounts',target);
 IF NOT EXISTS(SELECT 1 FROM public.staff_accounts s JOIN public.user_roles r USING(user_id) WHERE s.user_id=target AND s.is_active AND r.role='SUPER_ADMIN') THEN RAISE EXCEPTION 'Échec de vérification de l’activation.'; END IF;
END;
$$;