import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { agendaInput, agendaRow, agendaWindow, auditRow, confirmInput, daysInput, pageInput, periodInput, periodSchema, requestInput, requestRow, staffInput } from "./workflow-schemas";
import { requestPatientResolution } from "./request-patient";

export const readAgenda = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => agendaWindow.parse(v)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.rpc("read_agenda", { window_start: data.start, window_end: data.end, page_size: 100, page_offset: data.page*100 });
  if (result.error) throw new Error("Agenda indisponible. Vérifiez vos droits.");
  return z.array(agendaRow).parse(result.data);
});
export const saveAgenda = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => agendaInput.parse(v)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const args = { entry_id: data.id ?? null, selected_resource: data.resourceId, entry_kind: data.kind, selected_patient: data.patientId ?? null, selected_service: data.serviceId ?? null, begins_at: data.start, finishes_at: data.end, reason: data.reason, cancelled: data.cancelled } as unknown as Database["public"]["Functions"]["save_agenda_entry"]["Args"];
  const result = await context.supabase.rpc("save_agenda_entry", args);
  if (result.error) throw new Error("Enregistrement refusé : vérifiez les horaires, la durée du soin, les chevauchements et vos droits.");
  return result.data;
});
export const readRequests = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => pageInput.parse(v)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.rpc("read_appointment_requests", { page_size: 25, page_offset: data.page*25 });
  if (result.error) throw new Error("Demandes indisponibles.");
  return z.array(requestRow).parse(result.data);
});
export const confirmRequest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => confirmInput.parse(v)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const args = { request_id: data.requestId, selected_patient: data.patientId ?? null, selected_resource: data.resourceId, selected_service: data.serviceId, begins_at: data.start } as unknown as Database["public"]["Functions"]["confirm_appointment_request"]["Args"];
  const result = await context.supabase.rpc("confirm_appointment_request", args);
  if (result.error) throw new Error("Confirmation refusée : vérifiez le nom, le téléphone, la naissance, les horaires et les conflits. Réouvrez la demande si la fiche a changé.");
  return result.data;
});
export const resolveRequestPatient = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ requestId: z.string().uuid() }).parse(v)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.rpc("resolve_request_patient", { request_id: data.requestId });
  if (result.error) throw new Error("Vérification de la fiche indisponible.");
  return requestPatientResolution.parse(result.data);
});
async function publicReadClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"] ?? import.meta.env['VITE_SUPABASE_URL'];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Disponibilités indisponibles.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } } });
}
export const publicPeriods = createServerFn({ method: "POST" }).inputValidator((v: unknown) => periodInput.parse(v)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const client = await publicReadClient();
  const result = await client.rpc("available_request_periods", { requested_date: data.date });
  if (result.error) throw new Error("Disponibilités indisponibles.");
  return z.array(periodSchema).parse(result.data);
});
export const publicOpenDays = createServerFn({ method: "POST" }).inputValidator((v: unknown) => daysInput.parse(v)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const client = await publicReadClient();
  const result = await client.rpc("available_request_days", { days_ahead: data.days });
  if (result.error) throw new Error("Disponibilités indisponibles.");
  return z.array(z.string().date()).parse(result.data);
});
export const submitRequest = createServerFn({ method: "POST" }).inputValidator((v: unknown) => requestInput.parse(v)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  // Deliberately narrow privileged operation: this existing RPC is service-role-only,
  // inserts PENDING requests and enforces configured periods and duplicate protection.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const address = getRequestHeader("cf-connecting-ip") ?? "unidentified-connection";
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) throw new Error("Demande momentanément indisponible.");
  const hmacKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(address));
  const bucket = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
  const limit = await supabaseAdmin.rpc("consume_public_request_limit", { bucket_key: bucket });
  if (limit.error || !limit.data) throw new Error("Trop de tentatives. Réessayez dans dix minutes.");
  const result = await supabaseAdmin.rpc("submit_appointment_request", { given_name: data.first_name, family_name: data.last_name, tunisian_phone: data.phone, requested_date: data.date, requested_period: data.period, birth_date: data.birth_date, ...(data.care ? { requested_care: data.care } : {}) });
  if (result.error) throw new Error("Demande non enregistrée. Vérifiez les champs et la période ; une demande identique peut déjà exister.");
  return { success: true };
});
export const readStaff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  const [self, role] = await Promise.all([context.supabase.from("staff_accounts").select("is_active").eq("user_id", context.userId).maybeSingle(), context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle()]);
  if (self.error || role.error || !self.data?.is_active || role.data?.role !== "SUPER_ADMIN") throw new Error("Accès réservé au super administrateur.");
  const [profiles, accounts, roles, qualifications] = await Promise.all([context.supabase.from("profiles").select("user_id,display_name").order("created_at").limit(1000), context.supabase.from("staff_accounts").select("user_id,is_active").limit(1000), context.supabase.from("user_roles").select("user_id,role").limit(1000), context.supabase.from("professional_authorizations").select("user_id,is_verified_dentist,verified_at").limit(1000)]);
  if (profiles.error || accounts.error || roles.error || qualifications.error) throw new Error("Personnel indisponible.");
  return (profiles.data ?? []).map(p => ({ ...p, active: accounts.data?.find(a => a.user_id === p.user_id)?.is_active ?? false, role: roles.data?.find(r => r.user_id === p.user_id)?.role, dentist: qualifications.data?.some(q => q.user_id === p.user_id && q.is_verified_dentist && Boolean(q.verified_at)) ?? false }));
});
export const saveStaff = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => staffInput.parse(v)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.rpc("manage_staff_account", { target_user: data.userId, active: data.active, assigned_role: data.role, display_name: data.name });
  if (result.error) throw new Error("Modification refusée. Un super administrateur actif doit être conservé.");
  return { success: true };
});
export const readAudit = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => pageInput.parse(v)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.rpc("read_cabinet_audit", { page_size: 25, page_offset: data.page*25 });
  if (result.error) throw new Error("Journal réservé au super administrateur.");
  return z.array(auditRow).parse(result.data);
});