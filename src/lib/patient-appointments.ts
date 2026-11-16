import { z } from "zod";

export const patientAppointmentSchema = z.object({
  id: z.string().uuid(), patient_id: z.string().uuid(), kind: z.literal("APPOINTMENT"),
  starts_at: z.string(), ends_at: z.string(), is_cancelled: z.boolean(),
  service_name: z.string().nullable(), resource_name: z.string().nullable(),
});
export type PatientAppointment = z.infer<typeof patientAppointmentSchema>;

// Time alone does not establish attendance or completion of treatment.
export function isPastPatientAppointment(entry: { patient_id: string | null; kind: string; ends_at: string }, patientId: string, now: Date): boolean {
  return entry.patient_id === patientId && entry.kind === "APPOINTMENT" && Date.parse(entry.ends_at) <= now.getTime();
}