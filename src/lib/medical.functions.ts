import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { patientRowSchema } from "./patient-schemas";
import { medicalPageSchema, historyPageSchema, noteInputSchema, noteSchema, versionSchema } from "./medical-schemas";
import { canFinalizeMedicalNote } from "./cabinet-rules";
import { patientAppointmentSchema } from "./patient-appointments";

export const readPatientAppointments = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => medicalPageSchema.parse(input)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.rpc("read_patient_appointments", { selected_patient: data.patientId, page_size: 25, page_offset: data.page * 25 });
  if (result.error) throw new Error("Historique des rendez-vous indisponible ou accès refusé.");
  return z.array(patientAppointmentSchema).parse(result.data);
});

export const readMedicalDossier = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => medicalPageSchema.parse(input)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const patient = await context.supabase.rpc("read_patient", { patient_id: data.patientId });
  if (patient.error) throw new Error("Accès au dossier refusé.");
  const patients = z.array(patientRowSchema).parse(patient.data);
  const selected = patients[0];
  if (!selected) throw new Error("Patient introuvable.");
  const [notes, staff, qualification] = await Promise.all([
    context.supabase.rpc("read_medical_notes", { selected_patient: data.patientId, page_size: 25, page_offset: data.page * 25 }),
    context.supabase.from("staff_accounts").select("is_active").eq("user_id", context.userId).maybeSingle(),
    context.supabase.from("professional_authorizations").select("is_verified_dentist,verified_at").eq("user_id", context.userId).maybeSingle(),
  ]);
  if (notes.error || staff.error || qualification.error) throw new Error("Notes indisponibles ou accès refusé.");
  return { patient: selected, notes: z.array(noteSchema).parse(notes.data), canFinalize: canFinalizeMedicalNote(staff.data?.is_active === true, qualification.data?.is_verified_dentist === true && Boolean(qualification.data.verified_at)) };
});

export const saveMedicalNote = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => noteInputSchema.parse(input)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const args = { note_id: data.noteId ?? null, selected_patient: data.patientId, note_content: data.content, expected_revision: data.revision ?? null, finalize: data.finalize } as unknown as Database["public"]["Functions"]["save_medical_note"]["Args"];
  const result = await context.supabase.rpc("save_medical_note", args);
  if (result.error) {
    if (result.error.code === "40001") throw new Error("Cette note a changé. Rechargez le dossier avant de réessayer ; votre texte reste disponible.");
    if (result.error.code === "42501") throw new Error("Opération refusée : vérifiez votre habilitation ou l’état finalisé de la note.");
    throw new Error("Enregistrement impossible. Votre texte reste disponible.");
  }
  return result.data;
});

export const readNoteHistory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => historyPageSchema.parse(input)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.rpc("read_medical_note_history", { selected_note: data.noteId, page_size: 25, page_offset: data.page * 25 });
  if (result.error) throw new Error("Historique indisponible ou accès refusé.");
  return z.array(versionSchema).parse(result.data);
});