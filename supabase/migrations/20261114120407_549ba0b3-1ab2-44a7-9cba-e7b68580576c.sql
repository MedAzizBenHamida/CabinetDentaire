CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
ALTER FUNCTION public.current_staff_is_active() SET SCHEMA private;
ALTER FUNCTION public.current_staff_has_role(public.app_role) SET SCHEMA private;
ALTER POLICY profiles_read ON public.profiles USING (private.current_staff_is_active() AND (user_id = auth.uid() OR private.current_staff_has_role('SUPER_ADMIN')));
ALTER POLICY staff_read ON public.staff_accounts USING (private.current_staff_is_active() AND (user_id = auth.uid() OR private.current_staff_has_role('SUPER_ADMIN')));
ALTER POLICY roles_read ON public.user_roles USING (private.current_staff_is_active() AND (user_id = auth.uid() OR private.current_staff_has_role('SUPER_ADMIN')));