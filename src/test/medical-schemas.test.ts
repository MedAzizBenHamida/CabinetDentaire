import { describe, expect, it } from "vitest";
import { noteInputSchema } from "@/lib/medical-schemas";
describe("Medical version safeguards", () => {
  const input = { patientId: "00000000-0000-4000-8000-000000000001", content: "Note de test" };
  it("requires a saved draft before finalization", () => {
    expect(noteInputSchema.safeParse({ ...input, finalize: true }).success).toBe(false);
    expect(noteInputSchema.safeParse({ ...input, noteId: input.patientId, revision: 1, finalize: true }).success).toBe(true);
  });
  it("requires the expected revision when editing to preserve concurrent versions", () => {
    expect(noteInputSchema.safeParse({ ...input, noteId: input.patientId }).success).toBe(false);
    expect(noteInputSchema.safeParse({ ...input, noteId: input.patientId, revision: 2 }).success).toBe(true);
  });
});