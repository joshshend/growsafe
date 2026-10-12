// Stage notes (T21): "how children this age explore", one per age band, with a citation.
// Separate from the hazard KB so hazard files stay one-per-hazard. Validated by Zod and `kb:validate`.
import { z } from "zod";
import { STAGES, StageSchema, CitationSchema, type Stage } from "./schema";
import raw from "./stages.json";

export const StageNoteSchema = z.object({
  stage: StageSchema,
  explore: z.string().min(1), // 2 to 3 plain sentences
  es: z.string().min(1).optional(), // Spanish (not yet reviewed by a fluent reader)
  evidence_status: z.enum(["sourced", "verify"]), // "verify" = a human must re-check the page
  citation: CitationSchema,
});
export type StageNote = z.infer<typeof StageNoteSchema>;

const SENTENCE = /[.!?](\s|$)/g;

// Rules beyond the schema: every stage once, https citations, 2 to 3 sentences, no "safe".
export function stageNoteErrors(data: unknown): string[] {
  const parsed = z.array(StageNoteSchema).safeParse(data);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `stages.json ${i.path.join(".")}: ${i.message}`);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const n of parsed.data) {
    if (seen.has(n.stage)) out.push(`stages.json ${n.stage}: duplicate stage`);
    seen.add(n.stage);
    if (!n.citation.url.startsWith("https://"))
      out.push(`stages.json ${n.stage}: citation not https`);
    const sentences = (n.explore.match(SENTENCE) ?? []).length;
    if (sentences < 2 || sentences > 3) out.push(`stages.json ${n.stage}: needs 2 to 3 sentences`);
    for (const text of [n.explore, n.es ?? ""]) {
      if (/\bsafe\b/i.test(text)) out.push(`stages.json ${n.stage}: contains the word "safe"`);
    }
  }
  for (const s of STAGES) if (!seen.has(s)) out.push(`stages.json: missing stage ${s}`);
  return out;
}

let cache: Map<Stage, StageNote> | null = null;

// Stage notes keyed by stage. Throws if the file is invalid.
export function loadStageNotes(): Map<Stage, StageNote> {
  if (!cache) {
    const errors = stageNoteErrors(raw);
    if (errors.length) throw new Error(errors.join("; "));
    cache = new Map(
      z
        .array(StageNoteSchema)
        .parse(raw)
        .map((n) => [n.stage, n]),
    );
  }
  return cache;
}
