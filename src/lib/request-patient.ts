import { z } from "zod";
import { patientRowSchema, type Patient } from "./patient-schemas";

export const requestPatientResolution = z.object({
  status: z.enum(["NEW", "MATCH", "AMBIGUOUS", "REVIEW"]),
  patients: z.array(patientRowSchema),
  birth_date: z.string().date(),
});
export function matchesRequestPatient(patient: Patient, request: { first_name: string; last_name: string; phone: string; birth_date: string }) {
  const normalize = (value: string) => value.trim().toLowerCase();
  return normalize(patient.first_name) === normalize(request.first_name)
    && normalize(patient.last_name) === normalize(request.last_name)
    && patient.phone === request.phone && patient.birth_date === request.birth_date;
}