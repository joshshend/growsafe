import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./__fixtures__/cpsc-crib-mattress.json";
import raw from "./checklists.json";
import en from "../i18n/features/gear.en.json";
import es from "../i18n/features/gear.es.json";

const disk = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: async (k: string) => disk.get(k),
  set: async (k: string, v: unknown) => void disk.set(k, structuredClone(v)),
  del: async (k: string) => void disk.delete(k),
}));

import { useStore, startPersistence } from "../store/store";
import { buildViews } from "../store/selectors";
import { loadKb } from "../kb";
import { checkRecalls, matchRecalls, parseRecalls, shouldRecheck } from "./cpscClient";
import { checklistErrors, checklistFor, gearHazard, loadChecklists } from "./gear";
import { GEAR_TYPES, activeMatches } from "./types";
import { slimRecalls } from "./slim";
import { GET } from "../../api/recalls";

const s = () => useStore.getState();
const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe("CPSC client", () => {
  it("parses a saved API response and matches by brand", () => {
    const recalls = parseRecalls(fixture);
    expect(recalls).toHaveLength(3);
    const m = matchRecalls(recalls, { brand: "voomf", type: "crib" });
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ recallId: "10904", date: "2026-08-06", modelMentioned: false });
    expect(m[0]!.url).toMatch(/^https:\/\/www\.cpsc\.gov\/Recalls\/2026\//);
    expect(
      matchRecalls(recalls, { brand: "Crate & Barrel", type: "crib", model: "Hampshire" })[0]!
        .modelMentioned,
    ).toBe(true);
    expect(matchRecalls(recalls, { brand: "Graco", type: "crib" })).toEqual([]);
  });

  it("does not match a brand that is only part of another word", () => {
    expect(matchRecalls(parseRecalls(fixture), { brand: "Voom", type: "crib" })).toEqual([]);
  });

  it("rejects a response that is not a list", () => {
    expect(() => parseRecalls({ error: "x" })).toThrow();
  });

  it("checks every search term and returns matches with a timestamp", async () => {
    const fetchImpl = vi.fn(() => ok(fixture));
    const now = new Date("2026-10-12T10:00:00Z");
    const out = await checkRecalls({ brand: "KEAWIS", type: "bassinet" }, { fetchImpl, now });
    expect(out).toMatchObject({ ok: true, checkedAt: now.toISOString() });
    expect(out.ok && out.matches.map((m) => m.recallId)).toEqual(["10560"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2); // bassinet + cradle
  });

  it("falls back to the direct API when the proxy fails", async () => {
    const fetchImpl = vi.fn((u: string) =>
      u.startsWith("/api/recalls") ? Promise.reject(new Error("no proxy")) : ok(fixture),
    );
    const out = await checkRecalls({ brand: "voomf", type: "crib" }, { fetchImpl });
    expect(out.ok).toBe(true);
    expect(fetchImpl.mock.calls.some(([u]) => u.includes("saferproducts.gov"))).toBe(true);
  });

  it("reports offline on network failure instead of throwing", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await checkRecalls({ brand: "x", type: "crib" }, { fetchImpl })).toEqual({
      ok: false,
      reason: "offline",
    });
  });

  it("re-checks at most once a day", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    expect(shouldRecheck(undefined, now)).toBe(true);
    expect(shouldRecheck("2026-10-12T00:00:00Z", now)).toBe(false);
    expect(shouldRecheck("2026-10-11T12:00:00Z", now)).toBe(true);
    expect(shouldRecheck("garbage", now)).toBe(true);
  });
});

describe("proxy", () => {
  it("slims records and forwards only the search text", async () => {
    const slim = slimRecalls(fixture);
    expect(Object.keys(slim[0]!)).not.toContain("Images");
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(() => ok(fixture));
    const res = await GET(new Request("https://x.test/api/recalls?q=high%20chair&brand=Graco"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
    expect(String(spy.mock.calls[0]![0])).toBe(
      "https://www.saferproducts.gov/RestWebServices/Recall?format=json&ProductName=high%20chair",
    );
    spy.mockRestore();
    expect((await GET(new Request("https://x.test/api/recalls?q=%3Cscript%3E"))).status).toBe(400);
  });
});

describe("checklists", () => {
  it("every gear type has 5 to 8 sourced items and passes the content rules", () => {
    expect(checklistErrors(raw)).toEqual([]);
    for (const type of GEAR_TYPES) {
      const items = checklistFor(type);
      expect(items.length).toBeGreaterThanOrEqual(5);
      for (const it of items) expect(it.source.url).toMatch(/^https:\/\//);
    }
  });
  it("rejects an item that says safe", () => {
    const bad = structuredClone(raw) as typeof raw;
    bad.types.crib[0]!.fix = "Make sure it is safe.";
    expect(checklistErrors(bad).join()).toContain('"safe"');
  });
  it("has the same strings in English and Spanish", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const type of GEAR_TYPES) expect(en).toHaveProperty(`gear.type.${type}`);
  });
});

describe("gear in the store", () => {
  beforeEach(() => {
    disk.clear();
    s().reset();
  });

  const setup = () => {
    const now = new Date();
    s().addChild("Mia", now.getMonth() + 1, now.getFullYear() - 1);
    const home = s().addHome("Home", ["nursery", "kitchen"]);
    const id = s().addGear({ homeId: home, type: "crib", brand: "Graco", secondHand: true });
    return { home, id };
  };

  it("turns a 'no' answer into a normal task and a later 'yes' removes it", () => {
    const { id } = setup();
    const before = s().tasks.length;
    s().setGearAnswers(id, { slats: "no", sides: "yes" });
    const added = s().tasks.filter((t) => t.hazard_id.startsWith("gear:"));
    expect(added).toHaveLength(1);
    expect(s().tasks).toHaveLength(before + 1);
    const view = buildViews({ children: s().children, tasks: added }, loadKb(), new Date())[0]!;
    expect(view.hazard.name).toBe("Crib slats too far apart");
    expect(view.hazard.citations[0]!.url).toMatch(/^https:/);

    s().setStatus(added[0]!.id, "done");
    s().setGearAnswers(id, { slats: "no" }); // same answer keeps the progress
    expect(s().tasks.find((t) => t.id === added[0]!.id)?.status).toBe("done");

    s().setGearAnswers(id, { slats: "yes" });
    expect(s().tasks.some((t) => t.hazard_id.startsWith("gear:"))).toBe(false);
  });

  it("keeps gear tasks when the family changes, and drops them with the gear or home", () => {
    const { id, home } = setup();
    s().setGearAnswers(id, { slats: "no" });
    s().addChild("Noah", 1, new Date().getFullYear() - 2);
    expect(s().tasks.some((t) => t.hazard_id.startsWith("gear:"))).toBe(true);
    s().removeGear(id);
    expect(s().tasks.some((t) => t.hazard_id.startsWith("gear:"))).toBe(false);
    const id2 = s().addGear({ homeId: home, type: "car_seat", brand: "Britax", secondHand: false });
    s().setGearAnswers(id2, { chest: "no", "chest-clip": "no" });
    s().removeHome(home);
    expect(s().gear).toHaveLength(0);
    expect(s().tasks.some((t) => t.hazard_id.startsWith("gear:"))).toBe(false);
  });

  it("stores recall results and hides dismissed matches", () => {
    const { id } = setup();
    const m = matchRecalls(parseRecalls(fixture), { brand: "keawis", type: "crib" });
    s().setGearRecalls(id, "2026-10-12T00:00:00.000Z", m);
    expect(activeMatches(s().gear[0]!)).toHaveLength(1);
    s().dismissRecall(id, m[0]!.recallId);
    expect(activeMatches(s().gear[0]!)).toHaveLength(0);
    expect(s().gear[0]!.lastChecked).toBe("2026-10-12T00:00:00.000Z");
  });

  it("migrates a save from before gear existed and round-trips gear", async () => {
    disk.set("growsafe:state", {
      children: [],
      homes: [],
      tasks: [],
      owners: [],
      emergencyCards: {},
      settings: { lang: "en", largeText: false, perceptionConsent: false },
      schemaVersion: 1,
    });
    await s().hydrate();
    expect(s().gear).toEqual([]);
    expect(s().hydrated).toBe(true);

    s().reset();
    await startPersistence();
    s().addChild("Mia", 1, new Date().getFullYear() - 1);
    const home = s().addHome("Home", ["nursery"]);
    s().addGear({ homeId: home, type: "stroller", brand: "UPPAbaby", secondHand: false });
    await new Promise((r) => setTimeout(r, 0));
    const saved = disk.get("growsafe:state") as { gear: unknown[] };
    expect(saved.gear).toHaveLength(1);
  });

  it("builds a hazard record for every checklist item and none for unknown ids", () => {
    for (const type of GEAR_TYPES)
      for (const it of loadChecklists()[type])
        expect(gearHazard(`gear:${type}:${it.id}`)?.fix_steps[0]!.text).toBe(it.fix);
    expect(gearHazard("gear:crib:nope")).toBeNull();
    expect(gearHazard("stairs-and-gates")).toBeNull();
  });
});
