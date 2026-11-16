/** Portable validated business rules. Not a replacement for backend authorization. */
export const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "ASSISTANTE"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type AssistantMedicalAction = "READ" | "CREATE" | "EDIT" | "FINALIZE";

/** Only the explicitly validated assistant permissions; never accepts browser roles as proof. */
export function assistantMedicalActionAllowed(
  action: AssistantMedicalAction,
  active: boolean,
): boolean {
  return active && (action === "READ" || action === "CREATE" || action === "EDIT");
}

/** Every active staff member is in scope for all cabinet patients; action rights are separate. */
export function isPatientInStaffScope(active: boolean): boolean {
  return active;
}

/** Professional verification is independent of the technical staff role. */
export function canFinalizeMedicalNote(active: boolean, verifiedDentist: boolean): boolean {
  return active && verifiedDentist;
}

export const REQUEST_PERIODS = {
  MORNING: { startMinute: 8 * 60, endMinute: 13 * 60 },
  AFTERNOON: { startMinute: 15 * 60, endMinute: 17 * 60 },
} as const;
export type RequestPeriod = keyof typeof REQUEST_PERIODS;

export function isTunisianPhone(value: string): boolean {
  return /^\+216[0-9]{8}$/.test(value);
}

export function initialRequestStatus(): "PENDING" {
  return "PENDING";
}

export interface OpeningInterval {
  startMinute: number;
  endMinute: number;
}

/** Compatibility with configured opening hours, not internal appointment availability. */
export function isPeriodCompatible(
  period: RequestPeriod,
  openings: readonly OpeningInterval[],
): boolean {
  const reference = REQUEST_PERIODS[period];
  return openings.some((opening) =>
    Number.isInteger(opening.startMinute) &&
    Number.isInteger(opening.endMinute) &&
    opening.startMinute >= 0 && opening.endMinute <= 24 * 60 &&
    opening.startMinute < opening.endMinute &&
    Math.max(reference.startMinute, opening.startMinute) <
      Math.min(reference.endMinute, opening.endMinute),
  );
}

export interface ReservationInterval {
  resourceId: string;
  start: number;
  end: number;
}

function validateReservation(value: ReservationInterval): void {
  if (!value.resourceId || !Number.isFinite(value.start) ||
      !Number.isFinite(value.end) || value.start >= value.end) {
    throw new Error("Intervalle de réservation invalide.");
  }
}

/** UI pre-check only; PostgreSQL must independently guarantee concurrency safety. */
export function reservationsOverlap(a: ReservationInterval, b: ReservationInterval): boolean {
  validateReservation(a);
  validateReservation(b);
  return a.resourceId === b.resourceId && a.start < b.end && b.start < a.end;
}