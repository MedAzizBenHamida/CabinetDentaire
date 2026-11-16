import { describe, expect, it } from "vitest";
import { openingInput, settingsEditable } from "@/lib/settings-schemas";
describe("Cabinet settings rules", () => {
  it("permits configuration changes only to active administrators", () => {
    expect(settingsEditable(true, "SUPER_ADMIN")).toBe(true);
    expect(settingsEditable(true, "ADMIN")).toBe(true);
    expect(settingsEditable(true, "ASSISTANTE")).toBe(false);
    expect(settingsEditable(false, "SUPER_ADMIN")).toBe(false);
  });
  it("allows multiple valid intervals but rejects a reversed interval", () => {
    const base = { resourceId: "00000000-0000-4000-8000-000000000001", weekday: 1 };
    expect(openingInput.safeParse({ ...base, opens: "08:00", closes: "13:00" }).success).toBe(true);
    expect(openingInput.safeParse({ ...base, opens: "15:00", closes: "17:00" }).success).toBe(true);
    expect(openingInput.safeParse({ ...base, opens: "17:00", closes: "15:00" }).success).toBe(false);
  });
});