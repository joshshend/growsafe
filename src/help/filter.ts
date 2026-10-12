// Pure list logic for the Help tab: scope filter, zip-based ordering, grouping. No React.
import { HELP_CATEGORIES, type HelpCategory, type HelpEntry } from "./schema";

export type ScopeFilter = "all" | "texas" | "national";

export function parseZip(input: string): string | null {
  const z = input.trim();
  return /^\d{5}$/.test(z) ? z : null;
}

// Texas ZIP prefixes: 75-79 and 885 (El Paso). Approximate and used only for ordering.
export function isTexasZip(zip: string): boolean {
  const p2 = Number(zip.slice(0, 2));
  return (p2 >= 75 && p2 <= 79) || zip.startsWith("885");
}

// Only Austin (787xx) is mapped to a county list today; other zips return null.
export function countyForZip(zip: string): string | null {
  return zip.startsWith("787") ? "travis" : null;
}

function localRank(e: HelpEntry, zip: string | null): number {
  if (!zip || !isTexasZip(zip)) return 1;
  if (e.scope === "national") return 2;
  if (e.scope === "texas") return 1;
  return e.scope === countyForZip(zip) ? 0 : 1;
}

export interface HelpGroup {
  category: HelpCategory;
  entries: HelpEntry[];
}

// Filters, orders (checked entries first, then nearest scope, then file order) and groups by category.
// The emergency category is shown separately at the top of the tab, so it is left out here.
export function listResources(
  entries: HelpEntry[],
  opts: { scope?: ScopeFilter; zip?: string | null } = {},
): HelpGroup[] {
  const scope = opts.scope ?? "all";
  const zip = opts.zip ? parseZip(opts.zip) : null;
  const county = zip && isTexasZip(zip) ? countyForZip(zip) : null;
  const kept = entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => {
      if (e.category === "emergency") return false;
      if (scope === "national" && e.scope !== "national") return false;
      if (scope === "texas" && e.scope === "national") return false;
      // A county program is hidden when the zip shows the family lives elsewhere in Texas.
      const isCounty = e.scope !== "national" && e.scope !== "texas";
      if (isCounty && zip && isTexasZip(zip) && e.scope !== county) return false;
      return true;
    });
  kept.sort(
    (a, b) =>
      Number(b.e.verified) - Number(a.e.verified) ||
      localRank(a.e, zip) - localRank(b.e, zip) ||
      a.i - b.i,
  );
  return HELP_CATEGORIES.map((category) => ({
    category,
    entries: kept.filter(({ e }) => e.category === category).map(({ e }) => e),
  })).filter((g) => g.entries.length > 0);
}
