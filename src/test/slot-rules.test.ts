import { describe, expect, it } from "vitest";
import { daySlots, formatDayFr, minutesToTime, slotConflicts, timeToMinutes, weekdayOf } from "@/lib/slot-rules";

const openings = [
  { weekday: 1, opens_at: "08:00", closes_at: "13:00" },
  { weekday: 1, opens_at: "15:00", closes_at: "17:00" },
  { weekday: 6, opens_at: "08:00", closes_at: "13:00" },
];

describe("daySlots", () => {
  it("génère des créneaux de 30 minutes dans les plages d'ouverture du jour", () => {
    const slots = daySlots(openings, "2026-11-23", 30); // lundi
    expect(slots[0]).toBe("08:00");
    expect(slots).toContain("12:30");
    expect(slots).not.toContain("13:00");
    expect(slots).toContain("15:00");
    expect(slots).toContain("16:30");
    expect(slots).not.toContain("17:00");
    expect(slots).toHaveLength(14);
  });

  it("retourne une liste vide un jour sans ouverture (dimanche)", () => {
    expect(daySlots(openings, "2026-11-22", 30)).toEqual([]);
  });

  it("limite les créneaux à la période préférée du patient", () => {
    const morning = daySlots(openings, "2026-11-23", 30, "MORNING");
    expect(morning.every((s) => timeToMinutes(s) < 13 * 60)).toBe(true);
    const afternoon = daySlots(openings, "2026-11-23", 30, "AFTERNOON");
    expect(afternoon).toEqual(["15:00", "15:30", "16:00", "16:30"]);
  });

  it("exclut les débuts dont la durée dépasse la fermeture", () => {
    const slots = daySlots(openings, "2026-11-23", 60);
    expect(slots).not.toContain("12:30");
    expect(slots).toContain("12:00");
    expect(slots).not.toContain("16:30");
  });

  it("rejette une durée invalide", () => {
    expect(daySlots(openings, "2026-11-23", 0)).toEqual([]);
    expect(daySlots(openings, "2026-11-23", -30)).toEqual([]);
  });
});

describe("slotConflicts", () => {
  const busy = [{ starts_at: "2026-11-23T09:00:00+01:00", ends_at: "2026-11-23T09:30:00+01:00" }];

  it("détecte le chevauchement avec un rendez-vous existant", () => {
    expect(slotConflicts("2026-11-23", "09:00", 30, busy)).toBe(true);
    expect(slotConflicts("2026-11-23", "08:45", 30, busy)).toBe(true);
  });

  it("accepte les créneaux adjacents sans chevauchement", () => {
    expect(slotConflicts("2026-11-23", "08:00", 30, busy)).toBe(false);
    expect(slotConflicts("2026-11-23", "09:30", 30, busy)).toBe(false);
  });
});

describe("formatDayFr", () => {
  it("formate la date en français avec capitales", () => {
    expect(formatDayFr("2026-11-23")).toBe("Lundi 23 Novembre 2026");
    expect(formatDayFr("2026-11-21")).toBe("Samedi 21 Novembre 2026");
  });
});

describe("helpers horaires", () => {
  it("convertit heures et minutes", () => {
    expect(timeToMinutes("08:30")).toBe(510);
    expect(minutesToTime(510)).toBe("08:30");
  });

  it("calcule le jour de la semaine (0 = dimanche)", () => {
    expect(weekdayOf("2026-11-22")).toBe(0);
    expect(weekdayOf("2026-11-23")).toBe(1);
  });
});
