// Loads and validates every hazard JSON in ./data at build time (T2, T3).
import { HazardEntrySchema, type HazardEntry } from "./schema";

const modules = import.meta.glob("./data/*.json", { eager: true, import: "default" });

let cache: HazardEntry[] | null = null;

// All hazard entries, sorted by file name. Parsed once; throws if any entry is invalid.
export function loadKb(): HazardEntry[] {
  if (!cache) {
    cache = Object.entries(modules)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, data]) => {
        const parsed = HazardEntrySchema.safeParse(data);
        if (!parsed.success) throw new Error(`Invalid KB entry ${file}: ${parsed.error.message}`);
        return parsed.data;
      });
  }
  return cache;
}
