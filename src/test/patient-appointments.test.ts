import { describe, expect, it } from "vitest";
import { isPastPatientAppointment } from "@/lib/patient-appointments";

describe("Patient appointment history", () => {
  const now = new Date("2026-11-16T14:39:00Z");
  const entry = { patient_id: "patient-a", kind: "APPOINTMENT", ends_at: "2026-11-16T14:00:00Z" };
  it("includes only appointments whose end has passed, including the exact end boundary", () => {
    expect(isPastPatientAppointment(entry, "patient-a", now)).toBe(true);
    expect(isPastPatientAppointment({ ...entry, ends_at: now.toISOString() }, "patient-a", now)).toBe(true);
    expect(isPastPatientAppointment({ ...entry, ends_at: "2026-11-16T15:00:00Z" }, "patient-a", now)).toBe(false);
  });
  it("does not include another patient's appointments", () => {
    expect(isPastPatientAppointment(entry, "patient-b", now)).toBe(false);
  });
  it("does not include agenda blocks", () => {
    expect(isPastPatientAppointment({ ...entry, kind: "BLOCK" }, "patient-a", now)).toBe(false);
  });
});