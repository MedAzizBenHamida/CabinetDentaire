import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { patientSchema, patientRowSchema, searchSchema } from "./patient-schemas";
import type { Database } from "@/integrations/supabase/types";

export const readPatient = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ patientId: z.string().uuid() }).parse(v)).handler(async ({ context, data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.rpc("read_patient", { patient_id: data.patientId });
  if (result.error) throw new Error("Patient indisponible.");
  const row = z.array(patientRowSchema).parse(result.data)[0];
  if (!row) throw new Error("Patient introuvable.");
  return row;
});

export const searchPatients = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => searchSchema.parse(input)).handler(async ({ context, data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { data: rows, error } = await context.supabase.rpc("search_patients", { search_text: data.term, page_size: 25, page_offset: data.page * 25 });
    if (error) throw new Error("Accès refusé ou recherche indisponible. Vérifiez que votre compte personnel est actif et autorisé.");
    return z.array(patientRowSchema).parse(rows);
  });

export const savePatient = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => patientSchema.parse(input)).handler(async ({ context, data }) => {
    setResponseHeader("Cache-Control", "no-store");
    // PostgreSQL accepts NULL for creation; generated RPC types omit argument nullability.
    const args = { patient_id: data.id ?? null, given_name: data.first_name, family_name: data.last_name, date_of_birth: data.birth_date, tunisian_phone: data.phone } as unknown as Database["public"]["Functions"]["save_patient_record"]["Args"];
    const { data: id, error } = await context.supabase.rpc("save_patient_record", args);
    if (error) {
      if (error.code === "23505") throw new Error("Une fiche de même identité existe déjà.");
      if (error.code === "23514") throw new Error("Vérifiez la date de naissance et le téléphone tunisien.");
      throw new Error("Enregistrement refusé. Vérifiez vos droits ou réessayez.");
    }
    return id;
  });