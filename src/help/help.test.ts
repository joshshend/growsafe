import { describe, expect, it } from "vitest";
import { helpResources } from ".";
import { countyForZip, isTexasZip, listResources, parseZip } from "./filter";
import { validateHelp, type HelpEntry } from "./schema";
import en from "../i18n/features/help.en.json";
import es from "../i18n/features/help.es.json";

const base: HelpEntry = {
  id: "a",
  title: "A",
  what: "w",
  who: "x",
  cost: "Free",
  category: "food",
  scope: "texas",
  url: "https://example.org/",
  source_publisher: "p",
  last_verified: "2026-10-12",
  verified: true,
};
const mk = (o: Partial<HelpEntry>): HelpEntry => ({ ...base, ...o });

describe("help schema and data", () => {
  it("ships a valid file of 12 to 18 entries", () => {
    expect(validateHelp(helpResources)).toEqual([]);
    expect(helpResources.length).toBeGreaterThanOrEqual(12);
    expect(helpResources.length).toBeLessThanOrEqual(18);
  });
  it("rejects http urls, verified without a date, and duplicate ids", () => {
    expect(validateHelp([mk({ url: "http://example.org/" })]).length).toBeGreaterThan(0);
    expect(validateHelp([mk({ last_verified: null })]).length).toBeGreaterThan(0);
    expect(validateHelp([mk({}), mk({})]).map((i) => i.message)).toContain("duplicate id");
  });
  it("has English and Spanish strings for every UI key", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });
});

describe("listResources", () => {
  const data = [
    mk({ id: "unchecked", verified: false, last_verified: null }),
    mk({ id: "nat", scope: "national" }),
    mk({ id: "tx" }),
    mk({ id: "travis", scope: "travis" }),
    mk({ id: "sleep", category: "sleep", scope: "national" }),
    mk({ id: "emerg", category: "emergency", scope: "national" }),
  ];
  const ids = (g: ReturnType<typeof listResources>) => g.flatMap((x) => x.entries.map((e) => e.id));

  it("sorts an unverified entry last within its category", () => {
    const food = listResources(data).find((g) => g.category === "food")!;
    expect(food.entries.at(-1)!.id).toBe("unchecked");
  });
  it("filters by scope and leaves emergency to the top button", () => {
    expect(ids(listResources(data, { scope: "national" }))).toEqual(["sleep", "nat"]);
    expect(ids(listResources(data, { scope: "texas" }))).not.toContain("nat");
    expect(ids(listResources(data))).not.toContain("emerg");
  });
  it("puts Austin entries first for an Austin zip and hides them for other Texas zips", () => {
    const food = (zip: string) =>
      listResources(data, { zip })
        .find((g) => g.category === "food")!
        .entries.map((e) => e.id);
    expect(food("78701")).toEqual(["travis", "tx", "nat", "unchecked"]);
    expect(food("77001")).toEqual(["tx", "nat", "unchecked"]);
  });
  it("parses zips", () => {
    expect(parseZip(" 78701 ")).toBe("78701");
    expect(parseZip("787")).toBeNull();
    expect(isTexasZip("78701")).toBe(true);
    expect(isTexasZip("10001")).toBe(false);
    expect(countyForZip("78745")).toBe("travis");
  });
});
