import { z } from "zod";
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide");
export const serviceInput = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1, "Nom requis").max(100), minutes: z.number().int().min(1).max(1440), active: z.boolean() });
export const openingInput = z.object({ id: z.string().uuid().optional(), resourceId: z.string().uuid(), weekday: z.number().int().min(0).max(6), opens: time, closes: time }).refine(v => v.opens < v.closes, { message: "La fermeture doit suivre l’ouverture", path: ["closes"] });
export const closureInput = z.object({ id: z.string().uuid().optional(), resourceId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().trim().max(1000) });
export const removalInput = z.object({ id: z.string().uuid(), kind: z.enum(["OPENING", "CLOSURE"]) });
export function settingsEditable(active: boolean, role: string | undefined): boolean { return active && (role === "SUPER_ADMIN" || role === "ADMIN"); }