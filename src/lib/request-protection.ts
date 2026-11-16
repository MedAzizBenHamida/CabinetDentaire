export const PUBLIC_REQUEST_LIMIT = 5;
export const PUBLIC_REQUEST_WINDOW_MINUTES = 10;
export function publicRequestAllowed(attempts: number): boolean { return Number.isInteger(attempts) && attempts >= 1 && attempts <= PUBLIC_REQUEST_LIMIT; }