// Règles de créneaux horaires du cabinet — pures, sans dépendance navigateur ni framework.
// Pré-contrôles d'affichage uniquement : PostgreSQL reste la frontière d'application
// (exclusion de chevauchement, horaires et droits vérifiés côté base).

export type OpeningInterval = { weekday: number; opens_at: string; closes_at: string };
export type BusyInterval = { starts_at: string; ends_at: string };
export type DayPeriod = "MORNING" | "AFTERNOON";

export const SLOT_STEP_MINUTES = 30;
// Bornes des périodes publiques, identiques à la logique SQL (private.available_request_periods).
const MORNING_END_MINUTES = 13 * 60;

export function timeToMinutes(value: string): number {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Créneaux de début possibles pour une date, au pas de 30 minutes, dans les plages d'ouverture. */
export function daySlots(openings: OpeningInterval[], date: string, durationMinutes: number, period: DayPeriod | "ALL" = "ALL"): string[] {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) return [];
  const weekday = weekdayOf(date);
  const slots: string[] = [];
  for (const interval of openings.filter((o) => o.weekday === weekday)) {
    const open = timeToMinutes(interval.opens_at);
    const close = timeToMinutes(interval.closes_at);
    for (let start = open; start + durationMinutes <= close; start += SLOT_STEP_MINUTES) {
      if (period === "MORNING" && start >= MORNING_END_MINUTES) continue;
      if (period === "AFTERNOON" && start < MORNING_END_MINUTES) continue;
      slots.push(minutesToTime(start));
    }
  }
  return slots;
}

/** Vrai si le créneau [date time, +durée) chevauche un événement existant (heure de Tunis, UTC+1). */
export function slotConflicts(date: string, time: string, durationMinutes: number, busy: BusyInterval[]): boolean {
  const start = Date.parse(`${date}T${time}:00+01:00`);
  const end = start + durationMinutes * 60000;
  return busy.some((b) => Date.parse(b.starts_at) < end && Date.parse(b.ends_at) > start);
}

/** « Lundi 23 Novembre 2026 » — date affichée aux patients et au personnel. */
export function formatDayFr(date: string): string {
  const text = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  return text.replace(/(^|\s)(\p{Ll})/gu, (_match, space: string, letter: string) => space + letter.toUpperCase());
}
