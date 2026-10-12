import type { Child } from "../kb/schema";
import { ageMonths } from "../plan";

export function ageMonthsSafe(child: Child, now: Date): number {
  try {
    return ageMonths(child, now);
  } catch {
    return 0;
  }
}
