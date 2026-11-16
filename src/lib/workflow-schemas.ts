import { z } from "zod";
import { patientSchema } from "./patient-schemas";

export const pageInput = z.object({ page: z.number().int().min(0).default(0) });
const date = z.string().date();
export const agendaWindow = pageInput.extend({ start: z.string().datetime({ offset: true }), end: z.string().datetime({ offset: true }) }).refine(v => Date.parse(v.end) > Date.parse(v.start) && Date.parse(v.end) - Date.parse(v.start) <= 62 * 86400000, "Fenêtre invalide");
export const agendaRow = z.object({ id: z.string().uuid(), resource_id: z.string().uuid(), kind: z.enum(["APPOINTMENT", "BLOCK"]), patient_id: z.string().uuid().nullable(), service_id: z.string().uuid().nullable(), starts_at: z.string(), ends_at: z.string(), internal_reason: z.string(), is_cancelled: z.boolean() });
export type AgendaEntry = z.infer<typeof agendaRow>;
export const agendaInput = z.object({ id: z.string().uuid().optional(), resourceId: z.string().uuid(), kind: z.enum(["APPOINTMENT", "BLOCK"]), patientId: z.string().uuid().optional(), serviceId: z.string().uuid().optional(), start: z.string().datetime({ offset: true }), end: z.string().datetime({ offset: true }), reason: z.string().trim().max(2000), cancelled: z.boolean() }).superRefine((v,c) => {
  if (Date.parse(v.end) <= Date.parse(v.start)) c.addIssue({ code: "custom", message: "La fin doit suivre le début" });
  if (v.kind === "APPOINTMENT" && (!v.patientId || !v.serviceId)) c.addIssue({ code: "custom", message: "Patient et soin requis" });
  if (v.kind === "BLOCK" && (v.patientId || v.serviceId)) c.addIssue({ code: "custom", message: "Un blocage ne contient ni patient ni soin" });
});
export const periodSchema = z.enum(["MORNING", "AFTERNOON"]);
export const requestInput = patientSchema.omit({ id: true }).extend({ date, period: periodSchema, care: z.string().trim().max(100).default(""), website: z.string().max(0).default("") });
export const periodInput = z.object({ date });
export const daysInput = z.object({ days: z.number().int().min(1).max(45).default(28) });
export const requestRow = z.object({ id: z.string().uuid(), first_name: z.string(), last_name: z.string(), phone: z.string(), desired_date: date, desired_period: periodSchema, desired_care: z.string().nullable(), status: z.enum(["PENDING", "CONFIRMED"]), appointment_id: z.string().uuid().nullable(), created_at: z.string() });
export type AppointmentRequest = z.infer<typeof requestRow>;
export const confirmInput = z.object({ requestId: z.string().uuid(), patientId: z.string().uuid().optional(), resourceId: z.string().uuid(), serviceId: z.string().uuid(), start: z.string().datetime({ offset: true }) });
export const staffInput = z.object({ userId: z.string().uuid(), active: z.boolean(), role: z.enum(["SUPER_ADMIN", "ADMIN", "ASSISTANTE"]), name: z.string().trim().min(1).max(100) });
export const auditRow = z.object({ id: z.string().uuid(), actor_user_id: z.string().uuid().nullable(), operation: z.string(), entity_type: z.string(), entity_id: z.string().uuid(), created_at: z.string() });
export function tunisDate(value = new Date()): string { return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
export function tunisDateTime(value: string): string { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)).replace(" ", "T"); }
export function shiftDate(value: string, days: number): string { return new Date(Date.parse(`${value}T12:00:00Z`) + days * 86400000).toISOString().slice(0,10); }
export function calendarWindow(value: string, mode: "day" | "week" | "month") {
  const d = new Date(`${value}T12:00:00Z`);
  const start = mode === "month" ? `${value.slice(0,7)}-01` : mode === "week" ? shiftDate(value, -((d.getUTCDay()+6)%7)) : value;
  const count = mode === "month" ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1,0)).getUTCDate() : mode === "week" ? 7 : 1;
  return { start: `${start}T00:00:00+01:00`, end: `${shiftDate(start,count)}T00:00:00+01:00`, days: Array.from({ length: count }, (_,i) => shiftDate(start,i)) };
}