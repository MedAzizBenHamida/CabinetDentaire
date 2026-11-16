import { describe, expect, it } from "vitest";
import {
  STAFF_ROLES, REQUEST_PERIODS, initialRequestStatus, isTunisianPhone,
  isPeriodCompatible, reservationsOverlap, assistantMedicalActionAllowed, isPatientInStaffScope,
  canFinalizeMedicalNote,
} from "@/lib/cabinet-rules";

describe("Validated cabinet rules", () => {
  it("reserves finalization to an active professionally verified dentist", () => {
    expect(canFinalizeMedicalNote(true, true)).toBe(true);
    expect(canFinalizeMedicalNote(true, false)).toBe(false);
  });
  it("removes finalization rights immediately for an inactive dentist", () => {
    expect(canFinalizeMedicalNote(false, true)).toBe(false);
  });
  it("allows an active assistant to read, create and edit medical notes", () => {
    expect(assistantMedicalActionAllowed("READ", true)).toBe(true);
    expect(assistantMedicalActionAllowed("CREATE", true)).toBe(true);
    expect(assistantMedicalActionAllowed("EDIT", true)).toBe(true);
  });
  it("does not allow an assistant to finalize medical notes", () => {
    expect(assistantMedicalActionAllowed("FINALIZE", true)).toBe(false);
  });
  it("removes all assistant medical access when the account is inactive", () => {
    for (const action of ["READ", "CREATE", "EDIT", "FINALIZE"] as const) {
      expect(assistantMedicalActionAllowed(action, false)).toBe(false);
    }
  });
  it("puts all cabinet patients in scope for active staff only", () => {
    expect(isPatientInStaffScope(true)).toBe(true);
    expect(isPatientInStaffScope(false)).toBe(false);
  });
  it("requires +216 followed by exactly eight digits", () => {
    expect(isTunisianPhone("+21612345678")).toBe(true);
    for (const phone of ["12345678", "+2161234567", "+216123456789", "+3312345678", "+216abcdefgh"]) {
      expect(isTunisianPhone(phone)).toBe(false);
    }
  });
  it("starts every public request as PENDING", () => {
    expect(initialRequestStatus()).toBe("PENDING");
  });
  it("uses the three validated staff roles", () => {
    expect(STAFF_ROLES).toEqual(["SUPER_ADMIN", "ADMIN", "ASSISTANTE"]);
  });
  it("uses the 08:00–13:00 morning reference", () => {
    expect(REQUEST_PERIODS.MORNING).toEqual({ startMinute: 480, endMinute: 780 });
  });
  it("uses the 15:00–17:00 afternoon reference", () => {
    expect(REQUEST_PERIODS.AFTERNOON).toEqual({ startMinute: 900, endMinute: 1020 });
  });
  it("offers only periods compatible with actual configured opening intervals", () => {
    const openings = [{ startMinute: 540, endMinute: 720 }];
    expect(isPeriodCompatible("MORNING", openings)).toBe(true);
    expect(isPeriodCompatible("AFTERNOON", openings)).toBe(false);
    expect(isPeriodCompatible("MORNING", [])).toBe(false);
    expect(isPeriodCompatible("MORNING", [{ startMinute: 780, endMinute: 900 }])).toBe(false);
  });
  it("detects overlapping appointments on the same care resource", () => {
    expect(reservationsOverlap(
      { resourceId: "chair-1", start: 480, end: 540 },
      { resourceId: "chair-1", start: 510, end: 570 },
    )).toBe(true);
  });
  it("allows consecutive appointments and distinct resources", () => {
    const a = { resourceId: "chair-1", start: 480, end: 540 };
    expect(reservationsOverlap(a, { resourceId: "chair-1", start: 540, end: 600 })).toBe(false);
    expect(reservationsOverlap(a, { resourceId: "chair-2", start: 480, end: 540 })).toBe(false);
  });
  it("rejects invalid booking intervals", () => {
    expect(() => reservationsOverlap(
      { resourceId: "chair-1", start: 540, end: 480 },
      { resourceId: "chair-1", start: 480, end: 540 },
    )).toThrow("Intervalle de réservation invalide.");
  });
});