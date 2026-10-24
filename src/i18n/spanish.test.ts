// Spanish completeness: no placeholders, and every piece of user-facing content has Spanish text.
import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";
import { loadKb } from "../kb";
import { loadStageNotes } from "../kb/stages";
import { STAGES } from "../kb/schema";
import { loadChecklists } from "../recalls/gear";
import { GEAR_TYPES } from "../recalls/types";
import { helpResources } from "../help";

const featureEn = import.meta.glob<Record<string, string>>("./features/*.en.json", {
  eager: true,
  import: "default",
});
const featureEs = import.meta.glob<Record<string, string>>("./features/*.es.json", {
  eager: true,
  import: "default",
});

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
// Strings that are legitimately the same in both languages (names, numbers, units).
const SAME_OK = new Set([
  "app.title",
  "poison.number",
  "weekend.time.30",
  "visit.shareTitle",
  "lang.en",
  "plan.childAge",
  "task.minutes",
  "cost.single",
  "gear.no",
  "help.scope.texas",
  "help.scopeChip.texas",
  "help.scopeChip.local",
]);

const pairs: { file: string; key: string; en: string; es: string }[] = [];
for (const [path, dict] of [["./es.json", es] as const, ...Object.entries(featureEs)]) {
  const enDict: Record<string, string> =
    path === "./es.json" ? en : (featureEn[path.replace(".es.json", ".en.json")] ?? {});
  for (const [key, value] of Object.entries(dict)) {
    pairs.push({ file: path, key, en: enDict[key] ?? "", es: value });
  }
}

describe("Spanish UI strings", () => {
  it("has some strings to check", () => expect(pairs.length).toBeGreaterThan(300));
  it('has no "[ES]" placeholders', () => {
    expect(pairs.filter((p) => p.es.trimStart().startsWith("[ES]")).map((p) => p.key)).toEqual([]);
  });
  it("has no string that is just the English text", () => {
    const same = pairs.filter((p) => p.es === p.en && !SAME_OK.has(p.key)).map((p) => p.key);
    expect(same).toEqual([]);
  });
  it("keeps every {placeholder} of the English string", () => {
    const bad = pairs.filter((p) => p.en && placeholders(p.en) !== placeholders(p.es));
    expect(bad.map((p) => p.key)).toEqual([]);
  });
});

describe("Spanish content", () => {
  it("every KB entry has complete Spanish text", () => {
    for (const h of loadKb()) {
      const x = h.es;
      expect(x, `${h.id} has no es`).toBeDefined();
      if (!x) continue;
      expect(x.name.length, `${h.id} name`).toBeGreaterThan(0);
      expect(x.why_it_matters.length, `${h.id} why`).toBeGreaterThan(0);
      expect(x.fix_steps_text.length, `${h.id} steps`).toBe(h.fix_steps.length);
      expect(x.blind_spots.length, `${h.id} blind_spots`).toBe(h.blind_spots.length);
      expect(x.verify_rule.length, `${h.id} verify_rule`).toBeGreaterThan(0);
      expect(!!x.reminder_text, `${h.id} reminder_text`).toBe(!!h.reminder);
      for (const stage of Object.keys(h.severity))
        expect(
          x.severity_rationale[stage as (typeof STAGES)[number]],
          `${h.id} ${stage}`,
        ).toBeTruthy();
      for (const s of [
        x.name,
        x.why_it_matters,
        x.verify_rule,
        ...x.fix_steps_text,
        ...x.blind_spots,
      ])
        expect(s.trimStart().startsWith("[ES]"), `${h.id} placeholder`).toBe(false);
      expect(x.reviewed_by).toBeTruthy();
    }
  });
  it("every stage note has Spanish text", () => {
    for (const stage of STAGES) expect(loadStageNotes().get(stage)?.es, stage).toBeTruthy();
  });
  it("every Help resource has Spanish text", () => {
    for (const e of helpResources) {
      expect(e.es?.title, e.id).toBeTruthy();
      expect(e.es?.what, e.id).toBeTruthy();
      expect(e.es?.who, e.id).toBeTruthy();
    }
  });
  it("every gear checklist item has Spanish text", () => {
    const all = loadChecklists();
    for (const type of GEAR_TYPES)
      for (const it of all[type]) {
        expect(it.es?.title, `${type}.${it.id}`).toBeTruthy();
        expect(it.es?.q, `${type}.${it.id}`).toBeTruthy();
        expect(it.es?.fix, `${type}.${it.id}`).toBeTruthy();
      }
  });
});
