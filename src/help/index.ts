import raw from "./resources.json";
import { HelpFileSchema, type HelpEntry } from "./schema";

// Validated once at load; scripts/validate-help.ts and the tests also check the file.
export const helpResources: HelpEntry[] = HelpFileSchema.parse(raw);
