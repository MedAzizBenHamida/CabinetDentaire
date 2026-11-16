import { describe, expect, it } from "vitest";
import { patientSchema } from "@/lib/patient-schemas";
describe("Patient form domain validation", () => {
  const patient = { first_name: "Test", last_name: "Test", birth_date: "2000-01-01", phone: "+21612345678" };
  it("requires a Tunisian phone with eight digits", () => {
    expect(patientSchema.safeParse(patient).success).toBe(true);
    expect(patientSchema.safeParse({ ...patient, phone: "+2161234567" }).success).toBe(false);
  });
});