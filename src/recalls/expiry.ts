// Car seat expiry: the date is typed in from the label by the person; nothing here knows a seat's real
// expiry rule. Pure, no React.
export type Expiry =
  | { kind: "expired" }
  | { kind: "soon" } // today up to one month away
  | { kind: "months"; months: number };

export const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
export const NHTSA_LABEL_URL =
  "https://www.nhtsa.gov/car-seats-and-booster-seats/used-car-seat-safety-checklist";
export const NHTSA_RECALLS_URL = "https://www.nhtsa.gov/recalls";

// null when there is no valid date.
export function expiryStatus(expires: string | undefined, now: Date): Expiry | null {
  if (!expires || !ISO_DAY.test(expires)) return null;
  const [y, m, d] = expires.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  if (Number.isNaN(end.getTime()) || end.getMonth() !== m - 1) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (end < today) return { kind: "expired" };
  const months =
    (end.getFullYear() - today.getFullYear()) * 12 +
    (end.getMonth() - today.getMonth()) -
    (end.getDate() < today.getDate() ? 1 : 0);
  return months < 1 ? { kind: "soon" } : { kind: "months", months };
}
