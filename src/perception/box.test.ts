import { describe, expect, it } from "vitest";
import { PhotoFindingSchema, boxRect, parseBox } from "./box";
import { HostedProvider } from "./hosted";
import { SAMPLE_BOXES, sampleFindings } from "./scan";

describe("client box checks", () => {
  it("accepts a good box and rounds", () => {
    expect(parseBox([10, 20, 300, 400.4])).toEqual([10, 20, 300, 400]);
    expect(boxRect([10, 20, 300, 400])).toEqual({ x: 20, y: 10, w: 380, h: 290 });
  });
  it.each([[[1, 2, 3]], [[5, 5, 5, 9]], [[0, 0, 1000, 1000]], [[-1, 0, 10, 10]], ["x"], [null]])(
    "rejects %j",
    (b) => expect(parseBox(b)).toBeUndefined(),
  );
  it("a bad box drops the box, not the finding", () => {
    expect(PhotoFindingSchema.parse({ cue: "a", confidence: 0.9, box: [9, 9, 1, 1] })).toEqual({
      cue: "a",
      confidence: 0.9,
    });
    expect(PhotoFindingSchema.parse({ cue: "a", confidence: 0.9, box: [1, 2, 30, 40] })).toEqual({
      cue: "a",
      confidence: 0.9,
      box: [1, 2, 30, 40],
    });
  });
  it("HostedProvider keeps valid boxes and drops invalid ones", async () => {
    const f = (async () =>
      Response.json(
        {
          findings: [
            { cue: "a", confidence: 0.9, box: [10, 10, 200, 200] },
            { cue: "b", confidence: 0.9, box: [0, 0, 1000, 1000] },
          ],
        },
        { headers: { "X-Provider": "gemini" } },
      )) as unknown as typeof fetch;
    const out = await new HostedProvider(f).detect(new Blob(["x"]), ["a", "b"]);
    expect(out).toEqual([
      { cue: "a", confidence: 0.9, box: [10, 10, 200, 200] },
      { cue: "b", confidence: 0.9 },
    ]);
  });
  it("every sample box is valid and sample findings carry them", () => {
    for (const b of Object.values(SAMPLE_BOXES)) expect(parseBox(b)).toEqual(b);
    const s = sampleFindings(["unanchored_tv", "blind_cord", "uncovered_outlet"]);
    expect(s.every((x) => x.box)).toBe(true);
  });
});
