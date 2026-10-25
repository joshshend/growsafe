import { describe, expect, it } from "vitest";
import { translate } from "../i18n/t";
import { durationText } from "./format";

const en = (k: string, p?: Record<string, string | number>) => translate(k, p, "en");
const es = (k: string, p?: Record<string, string | number>) => translate(k, p, "es");

describe("durationText", () => {
  it("says about N min under an hour", () => {
    expect(durationText(en, 25)).toBe("about 25 min");
    expect(durationText(en, 17)).toBe("about 15 min");
    expect(durationText(en, 1)).toBe("about 5 min");
    expect(durationText(en, 57)).toBe("about 55 min");
  });
  it("says hours and minutes from an hour up", () => {
    expect(durationText(en, 60)).toBe("about 1 hr");
    expect(durationText(en, 90)).toBe("about 1 hr 30 min");
    expect(durationText(en, 125)).toBe("about 2 hr 5 min");
    expect(durationText(en, 59)).toBe("about 1 hr");
  });
  it("has Spanish", () => {
    expect(durationText(es, 25)).toBe("unos 25 min");
    expect(durationText(es, 90)).toBe("unos 1 h 30 min");
  });
});
