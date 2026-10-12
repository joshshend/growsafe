import { describe, expect, it, vi } from "vitest";
import { loadKb } from "../kb";
import { buildPlan } from "../plan";
import { childAged, NOW } from "../plan/fixtures";
import en from "../i18n/features/people.en.json";
import es from "../i18n/features/people.es.json";
import { decodePlan, encodePlan, redact } from "../share";
import { AUDIT_HAZARDS, auditChanges, auditItems } from "./audit";
import { buildBriefing, lines } from "./briefing";
import { emptyCard, normalizeCard } from "./store";

const kb = loadKb();
const home = { id: "h1", name: "Our home", rooms: ["kitchen", "bedroom", "bathroom"] as const };
const child = childAged("c1", 14);
const plan = () => {
  const h = { ...home, rooms: [...home.rooms] };
  return { children: [child], homes: [h], tasks: buildPlan(kb, [child], [h], NOW) };
};

describe("emergency card privacy", () => {
  it("never appears in encodePlan output, even if it rides along on the plan object", () => {
    const secret = "PEANUT-ALLERGY-XYZ";
    const p = { ...plan(), emergencyCards: { c1: { ...emptyCard(), allergies: secret } } };
    const shared = redact(p as never, NOW);
    expect(JSON.stringify(shared)).not.toContain(secret);
    const link = encodePlan(shared);
    expect(JSON.stringify(decodePlan(link))).not.toContain(secret);
    expect(Object.keys(shared)).not.toContain("emergencyCards");
  });
  it("normalizeCard clips and repairs stored data", () => {
    const c = normalizeCard({ allergies: "x".repeat(5000), contacts: [{ name: 3 }] });
    expect(c.allergies.length).toBe(600);
    expect(c.contacts).toHaveLength(2);
    expect(c.contacts[0]!.name).toBe("");
  });
});

describe("medicine check", () => {
  const items = auditItems(kb);
  it("is built from the KB and covers visitors' purses and bags", () => {
    expect(new Set(items.map((i) => i.hazardId))).toEqual(new Set(AUDIT_HAZARDS));
    const med = kb.find((h) => h.id === "medicine-storage")!;
    expect(med.fix_steps.some((s) => /purses|bags/.test(s.text))).toBe(true);
    expect(items.filter((i) => i.hazardId === "medicine-storage")).toHaveLength(
      med.fix_steps.length,
    );
  });
  it("no keeps tasks open, all yes completes them, partial answers change nothing", () => {
    const { tasks } = plan();
    const mine = items.filter((i) => i.hazardId === "medicine-storage");
    const yes = Object.fromEntries(mine.map((i) => [i.id, "yes" as const]));
    const done = auditChanges(tasks, "h1", items, yes);
    expect(done.length).toBeGreaterThan(0);
    expect(done.every((c) => c.status === "done")).toBe(true);
    const partial = auditChanges(tasks, "h1", items, { [mine[0]!.id]: "yes" });
    expect(partial).toEqual([]);
    const finished = tasks.map((t) =>
      t.hazard_id === "medicine-storage" ? { ...t, status: "done" as const } : t,
    );
    const reopened = auditChanges(finished, "h1", items, { ...yes, [mine[1]!.id]: "no" });
    expect(reopened.every((c) => c.status === "todo")).toBe(true);
    expect(reopened.length).toBeGreaterThan(0);
  });
});

describe("briefing", () => {
  it("lists at most 5 open tasks, ranked, with age band and no names beyond nicknames", () => {
    const p = plan();
    const b = buildBriefing(kb, p.homes[0]!, p.children, p.tasks, NOW);
    expect(b.top.length).toBeLessThanOrEqual(5);
    expect(b.top.length).toBeGreaterThan(0);
    const scores = b.top.map((v) => v.ranked?.score ?? 0);
    expect([...scores].sort((a, z) => z - a)).toEqual(scores);
    expect(b.children[0]).toMatchObject({ nickname: child.nickname, stage: "12-24m" });
    expect(JSON.stringify(b)).not.toMatch(/birth_/);
  });
  it("splits free text into lines", () => {
    expect(lines(" a \n\n b\r\n")).toEqual(["a", "b"]);
  });
});

describe("print stylesheet and strings", async () => {
  const fs = await vi.importActual<{ readFileSync: (p: string, enc: string) => string }>("node:fs");
  const css = fs.readFileSync("src/ui/emergency.css", "utf8");
  it("hides chrome and shows print-only content when printing", () => {
    const print = css.slice(css.indexOf("@media print"));
    expect(print).toMatch(/\.tabbar/);
    expect(print).toMatch(/\.topbar/);
    expect(print).toMatch(/\.print-only\s*\{[^}]*display:\s*block/);
    expect(css).toMatch(/\.print-only\s*\{\s*display:\s*none/);
  });
  it("Spanish file has the same keys as English", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });
});
