import { beforeEach, describe, expect, it } from "vitest";
import { loadKb } from "../kb";
import type { Task } from "../kb/schema";
import { translate } from "../i18n/t";
import { applyEasy, saveEasy, readEasy } from "./easy";
import { buildSpeechScript } from "./readAloud";

const kb = loadKb();
const task = (hazard_id: string): Task => ({
  id: "t1",
  hazard_id,
  home_id: "h",
  room: kb[0]!.rooms[0]!,
  childIds: [],
  status: "todo",
});

describe("buildSpeechScript", () => {
  it("reads title, one-sentence why, and numbered steps without URLs or citations", () => {
    const h = kb[0]!;
    const s = buildSpeechScript(task(h.id), kb, "en");
    expect(s[0]).toBe(h.name);
    expect(s.length).toBe(2 + h.fix_steps.length);
    expect(s[2]).toMatch(/^Step 1\. /);
    expect(s.join(" ")).not.toMatch(/https?:|\[\d+\]/);
    expect(s[1]!.match(/[.!?]/g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
  it("follows the app language and handles unknown hazards", () => {
    const es = buildSpeechScript(task(kb[0]!.id), kb, "es");
    expect(es[2]).toMatch(/^Paso 1\. /);
    expect(buildSpeechScript(task("nope"), kb, "en")).toEqual([]);
    expect(translate("easy.step", { n: 3 }, "en")).toBe("Step 3.");
  });
});

describe("easy mode", () => {
  beforeEach(() => {
    localStorage.clear();
    applyEasy(false);
  });
  it("toggles the data attribute and persists", () => {
    saveEasy(true);
    expect(document.documentElement.getAttribute("data-easy")).toBe("on");
    expect(readEasy()).toBe(true);
    saveEasy(false);
    expect(document.documentElement.hasAttribute("data-easy")).toBe(false);
    expect(readEasy()).toBe(false);
  });
  it("sets 56px targets and 22px type in CSS tokens", async () => {
    const fsName: string = "node:fs";
    const fs = (await import(/* @vite-ignore */ fsName)) as {
      readFileSync: (p: string, e: string) => string;
    };
    const css = fs.readFileSync("src/ui/tokens.css", "utf8");
    const block = css.match(/:root\[data-easy="on"\] \{([^}]*)\}/)![1]!;
    expect(block).toMatch(/--min-target:\s*56px/);
    expect(block).toMatch(/--fs-body:\s*22px/);
    expect(css).toMatch(/\[data-easy="on"\] \.btn[^{]*\{[^}]*min-height:\s*var\(--min-target\)/);
  });
});
