import { describe, expect, it } from "vitest";
import { matchesRequestPatient } from "@/lib/request-patient";
import { confirmInput } from "@/lib/workflow-schemas";
const id = "00000000-0000-4000-8000-000000000001";
const patient = { id, first_name: "Ali", last_name: "Test", phone: "+21612345678", birth_date: "1990-05-12" };
describe("Request patient association", () => {
  it("reuses a matching name and phone despite case and outer spaces", () => {
    expect(matchesRequestPatient(patient, { ...patient, first_name: " ali ", last_name: "TEST" })).toBe(true);
  });
  it("never associates homonyms with different phone numbers", () => {
    expect(matchesRequestPatient(patient, { ...patient, phone: "+21687654321" })).toBe(false);
  });
  it("never associates a different name on a shared phone", () => {
    expect(matchesRequestPatient(patient, { ...patient, first_name: "Amal" })).toBe(false);
  });
  it("requires matching birth dates for otherwise identical identities", () => {
    expect(matchesRequestPatient(patient, { ...patient, birth_date: "1991-05-12" })).toBe(false);
  });
  it("allows automatic patient resolution without a manual patient ID", () => {
    const input = { requestId: id, resourceId: id, serviceId: id, start: "2026-11-17T09:00:00+01:00" };
    expect(confirmInput.safeParse(input).success).toBe(true);
    expect(confirmInput.safeParse({ ...input, patientId: "invalid" }).success).toBe(false);
  });
});