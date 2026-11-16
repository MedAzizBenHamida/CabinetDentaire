CREATE TYPE public.app_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'ASSISTANTE');

CREATE TABLE public.profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (false);

CREATE TABLE public.staff_accounts (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 is_active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_accounts TO authenticated;
GRANT ALL ON public.staff_accounts TO service_role;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON public.staff_accounts FOR SELECT TO authenticated USING (false);

CREATE TABLE public.user_roles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role public.app_role NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_read ON public.user_roles FOR SELECT TO authenticated USING (false);

CREATE FUNCTION public.current_staff_is_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.staff_accounts WHERE user_id = auth.uid() AND is_active);
$$;
REVOKE ALL ON FUNCTION public.current_staff_is_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_staff_is_active() TO authenticated;

CREATE FUNCTION public.current_staff_has_role(required_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.staff_accounts s JOIN public.user_roles r ON r.user_id = s.user_id WHERE s.user_id = auth.uid() AND s.is_active AND r.role = required_role);
$$;
REVOKE ALL ON FUNCTION public.current_staff_has_role(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_staff_has_role(public.app_role) TO authenticated;

ALTER POLICY profiles_read ON public.profiles USING (public.current_staff_is_active() AND (user_id = auth.uid() OR public.current_staff_has_role('SUPER_ADMIN')));
ALTER POLICY staff_read ON public.staff_accounts USING (public.current_staff_is_active() AND (user_id = auth.uid() OR public.current_staff_has_role('SUPER_ADMIN')));
ALTER POLICY roles_read ON public.user_roles USING (public.current_staff_is_active() AND (user_id = auth.uid() OR public.current_staff_has_role('SUPER_ADMIN')));

CREATE FUNCTION public.staff_set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
REVOKE ALL ON FUNCTION public.staff_set_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.staff_set_updated_at();
CREATE TRIGGER staff_updated BEFORE UPDATE ON public.staff_accounts FOR EACH ROW EXECUTE FUNCTION public.staff_set_updated_at();
CREATE TRIGGER roles_updated BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.staff_set_updated_at();

CREATE FUNCTION public.initialize_staff_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.profiles(user_id) VALUES (NEW.id);
 INSERT INTO public.staff_accounts(user_id, is_active) VALUES (NEW.id, false);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.initialize_staff_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER initialize_staff_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.initialize_staff_profile();