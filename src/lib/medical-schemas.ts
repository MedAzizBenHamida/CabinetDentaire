import { z } from "zod";
export const medicalPageSchema = z.object({ patientId: z.string().uuid(), page: z.number().int().min(0).default(0) });
export const historyPageSchema = z.object({ noteId: z.string().uuid(), page: z.number().int().min(0).default(0) });
export const noteInputSchema = z.object({ patientId: z.string().uuid(), noteId: z.string().uuid().optional(), content: z.string().trim().min(1, "Contenu requis").max(20000), revision: z.number().int().positive().optional(), finalize: z.boolean().default(false) }).superRefine((value, ctx) => {
  if (value.noteId && !value.revision) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Révision requise", path: ["revision"] });
  if (value.finalize && !value.noteId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enregistrez un brouillon avant finalisation", path: ["finalize"] });
});
export const noteSchema = z.object({ id: z.string().uuid(), patient_id: z.string().uuid(), content: z.string(), revision: z.number().int().positive(), created_at: z.string(), updated_at: z.string(), finalized_at: z.string().nullable(), finalized_by: z.string().uuid().nullable() });
export const versionSchema = z.object({ id: z.string().uuid(), note_id: z.string().uuid(), content: z.string(), revision: z.number().int().positive(), created_at: z.string(), finalized_at: z.string().nullable() });
export type MedicalNote = z.infer<typeof noteSchema>;