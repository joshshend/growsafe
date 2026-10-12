import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";
import { translate } from "./t";
import { loadKb } from "../kb";
import { childAged, NOW } from "../plan/fixtures";
import { rankHazards } from "../plan";
import { reasonText } from "../ui/format";

describe("i18n", () => {
  it("es has exactly the keys of en", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });
  it("interpolates params", () => {
    expect(translate("plan.progress", { done: 2, total: 9 })).toBe("2 of 9 done");
    expect(translate("cost.range", { min: 5, max: 20 })).toBe("$5 to $20");
  });
  it("renders every ranking reason as a plain sentence with no raw keys or braces", () => {
    const t = (k: string, p?: Record<string, string | number>) => translate(k, p, "en");
    const ranked = [
      ...rankHazards(loadKb(), childAged("a", 9), NOW),
      ...rankHazards(loadKb(), childAged("b", 20), NOW),
      ...rankHazards(loadKb(), childAged("c", 5), NOW),
    ];
    expect(ranked.length).toBeGreaterThan(0);
    for (const r of ranked)
      for (const reason of r.reasons) {
        const text = reasonText(t, reason);
        expect(text).not.toMatch(/reason\.|\{|\}|undefined|NaN/);
        expect(text.length).toBeGreaterThan(15);
      }
  });
});
