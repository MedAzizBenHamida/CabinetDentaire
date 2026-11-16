import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { serviceInput, openingInput, closureInput, removalInput, settingsEditable } from "./settings-schemas";

export const readCabinetSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  const [staff, role] = await Promise.all([
    context.supabase.from("staff_accounts").select("is_active").eq("user_id", context.userId).maybeSingle(),
    context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle(),
  ]);
  if (staff.error || role.error || !staff.data?.is_active || !role.data) throw new Error("Accès réservé au personnel actif autorisé.");
  const [resources, services, openings, closures] = await Promise.all([
    context.supabase.from("care_resources").select("id,name,is_active").order("name").limit(1000),
    context.supabase.from("care_services").select("id,name,duration_minutes,is_active").order("name").limit(1000),
    context.supabase.from("opening_intervals").select("id,resource_id,weekday,opens_at,closes_at").order("weekday").order("opens_at").limit(1000),
    context.supabase.from("exceptional_closures").select("id,resource_id,closed_on,reason").order("closed_on", { ascending: false }).limit(1000),
  ]);
  if (resources.error || services.error || openings.error || closures.error) throw new Error("Réglages indisponibles.");
  return { resources: resources.data ?? [], services: services.data ?? [], openings: openings.data ?? [], closures: closures.data ?? [], canEdit: settingsEditable(staff.data.is_active, role.data.role) };
});

export const saveCareService = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => serviceInput.parse(input)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const args = { service_id: data.id ?? null, service_name: data.name, minutes: data.minutes, active: data.active } as unknown as Database["public"]["Functions"]["save_care_service"]["Args"];
  const result = await context.supabase.rpc("save_care_service", args);
  if (result.error) throw new Error("Soin non enregistré. Vérifiez vos droits et la durée.");
  return result.data;
});
export const saveOpening = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => openingInput.parse(input)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const args = { interval_id: data.id ?? null, selected_resource: data.resourceId, day_of_week: data.weekday, opening_time: data.opens, closing_time: data.closes } as unknown as Database["public"]["Functions"]["save_opening_interval"]["Args"];
  const result = await context.supabase.rpc("save_opening_interval", args);
  if (result.error) throw new Error("Plage non enregistrée. Vérifiez vos droits, les chevauchements et les rendez-vous existants.");
  return result.data;
});
export const saveClosure = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => closureInput.parse(input)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const args = { closure_id: data.id ?? null, selected_resource: data.resourceId, closed_date: data.date, closure_reason: data.reason } as unknown as Database["public"]["Functions"]["save_exceptional_closure"]["Args"];
  const result = await context.supabase.rpc("save_exceptional_closure", args);
  if (result.error) throw new Error("Fermeture non enregistrée. Vérifiez vos droits, les doublons et les rendez-vous existants.");
  return result.data;
});
export const removeSetting = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => removalInput.parse(input)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.rpc("remove_schedule_configuration", { record_id: data.id, configuration_kind: data.kind });
  if (result.error) throw new Error("Suppression refusée. Vérifiez vos droits et les rendez-vous existants.");
  return { success: true };
});