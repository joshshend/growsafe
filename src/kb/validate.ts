// KB validation: Zod parse plus project rules (T2). Pure functions, used by the CLI and tests.
import { HazardEntrySchema, type HazardEntry } from "./schema";

export interface KbError {
  file: string;
  id: string;
  message: string;
}

const SAFE = /\bsafe\b/i; // "safety" is allowed; the bare word "safe" is not
const FIREARM = /firearm|\bguns?\b/i; // firearm content is omitted by design
const DOSING = /\bmg\b|\bml\b|dose of/i; // no dosing guidance

function texts(e: HazardEntry): { where: string; text: string }[] {
  return [
    { where: "why_it_matters", text: e.why_it_matters },
    ...e.fix_steps.map((s, i) => ({ where: `fix_steps[${i}]`, text: s.text })),
  ];
}

// Rules applied to an already-parsed entry.
export function ruleErrors(e: HazardEntry): string[] {
  const out: string[] = [];
  for (const { where, text } of texts(e)) {
    if (SAFE.test(text)) out.push(`${where}: contains the word "safe"`);
    if (DOSING.test(text) && where.startsWith("fix_steps"))
      out.push(`${where}: contains dosing words`);
  }
  const all = JSON.stringify(e);
  if (FIREARM.test(all)) out.push("contains firearm/gun text (omitted by design)");
  e.citations.forEach((c, i) => {
    if (!c.url.startsWith("https://")) out.push(`citations[${i}].url is not https`);
  });
  e.injury_evidence.forEach((c, i) => {
    if (!c.url.startsWith("https://")) out.push(`injury_evidence[${i}].url is not https`);
  });
  return out;
}

// Validate many raw entries (file name + parsed JSON). Returns a flat error list.
export function validateEntries(items: { file: string; data: unknown }[]): KbError[] {
  const errors: KbError[] = [];
  const seen = new Map<string, string>();
  for (const { file, data } of items) {
    const rawId = (data as { id?: unknown } | null)?.id;
    const id = typeof rawId === "string" ? rawId : "(no id)";
    const parsed = HazardEntrySchema.safeParse(data);
    if (!parsed.success) {
      for (const i of parsed.error.issues) {
        errors.push({ file, id, message: `${i.path.join(".") || "(root)"}: ${i.message}` });
      }
      continue;
    }
    const e = parsed.data;
    const prior = seen.get(e.id);
    if (prior) errors.push({ file, id, message: `duplicate id (also in ${prior})` });
    else seen.set(e.id, file);
    for (const message of ruleErrors(e)) errors.push({ file, id, message });
  }
  return errors;
}
