// Stage notes (T21): "how children this age explore", one per age band, with a citation.
// Separate from the hazard KB so hazard files stay one-per-hazard. Validated by Zod and `kb:validate`.
import { z } from "zod";
import { STAGES, StageSchema, CitationSchema, type Stage } from "./schema";
import raw from "./stages.json";

// One CDC checkpoint ("by 12 months"), as a short phrase that finishes "Around 12 months: ...".
export const MilestoneSchema = z.object({
  months: z.number().int().min(1).max(60), // the CDC checkpoint age
  en: z.string().min(1),
  es: z.string().min(1), // Spanish (not yet reviewed by a fluent reader)
  url: z.string().url(), // the CDC page for that age
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const StageNoteSchema = z.object({
  stage: StageSchema,
  explore: z.string().min(1), // 2 to 3 plain sentences
  es: z.string().min(1).optional(), // Spanish (not yet reviewed by a fluent reader)
  evidence_status: z.enum(["sourced", "verify"]), // "verify" = a human must re-check the page
  citation: CitationSchema,
  milestones: z.array(MilestoneSchema).min(1), // CDC checkpoints that fall inside this stage
});
export type StageNote = z.infer<typeof StageNoteSchema>;

// [from, to) in months; the last stage also holds the 60-month checkpoint.
const BOUNDS: Record<Stage, [number, number]> = {
  "0-3m": [0, 3],
  "3-6m": [3, 6],
  "6-12m": [6, 12],
  "12-24m": [12, 24],
  "24-36m": [24, 36],
  "36-60m": [36, 60],
};

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
    for (const text of [n.explore, n.es ?? "", ...n.milestones.flatMap((m) => [m.en, m.es])]) {
      if (/\bsafe\b/i.test(text)) out.push(`stages.json ${n.stage}: contains the word "safe"`);
    }
    const [from, to] = BOUNDS[n.stage];
    for (const m of n.milestones) {
      const inside =
        m.months >= from && (m.months < to || (n.stage === "36-60m" && m.months === to));
      if (!inside)
        out.push(`stages.json ${n.stage}: milestone at ${m.months} months is outside the stage`);
      if (!m.url.startsWith("https://"))
        out.push(`stages.json ${n.stage}: milestone url not https`);
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

// Every CDC checkpoint, oldest first, each with its stage's evidence status.
export interface Checkpoint extends Milestone {
  stage: Stage;
  evidence_status: "sourced" | "verify";
}
export function loadMilestones(): Checkpoint[] {
  return [...loadStageNotes().values()]
    .flatMap((n) =>
      n.milestones.map((m) => ({ ...m, stage: n.stage, evidence_status: n.evidence_status })),
    )
    .sort((a, b) => a.months - b.months);
}
