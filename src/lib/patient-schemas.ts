import { z } from "zod";

export const patientSchema = z.object({
  id: z.string().uuid().optional(),
  first_name: z.string().trim().min(1, "Prénom requis").max(100),
  last_name: z.string().trim().min(1, "Nom requis").max(100),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date requise"),
  phone: z.string().regex(/^\+216[0-9]{8}$/, "Format requis : +216 et 8 chiffres"),
});
export const patientRowSchema = patientSchema.extend({ id: z.string().uuid() });
export type Patient = z.infer<typeof patientRowSchema>;
export const searchSchema = z.object({ term: z.string().trim().max(100).default(""), page: z.number().int().min(0).default(0) });