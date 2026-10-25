import { afterEach, describe, expect, it, vi } from "vitest";
import { fitSize, stripAndResize } from "./exif";
import { assessPixels } from "./quality";
import { HostedProvider, TIMEOUT_MS, providerStatus } from "./hosted";
import { DetectError } from "./provider";
import { PhotoError, mayScan, sampleFindings, scanPhoto } from "./scan";

afterEach(() => vi.unstubAllGlobals());

describe("exif / resize", () => {
  it("fits the long edge to 1280 and never upscales", () => {
    expect(fitSize(4032, 3024)).toEqual({ width: 1280, height: 960 });
    expect(fitSize(3024, 4032)).toEqual({ width: 960, height: 1280 });
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("re-draws onto a canvas and returns the canvas JPEG (pixels only, so metadata is gone)", async () => {
    const drawImage = vi.fn();
    const toBlob = vi.fn((cb: BlobCallback, type?: string, q?: number) => {
      expect(type).toBe("image/jpeg");
      expect(q).toBe(0.8);
      cb(new Blob(["jpegbytes"], { type: "image/jpeg" }));
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillRect: vi.fn(),
      drawImage,
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(toBlob as never);
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", async () => ({ width: 4000, height: 2000, close }));
    // Input carries fake EXIF/GPS marker bytes; the output must not.
    const input = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe1]), "Exif GPS 30.26N"]);
    const { jpeg, canvas } = await stripAndResize(input);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(640);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 640);
    expect(jpeg.size).toBe("jpegbytes".length);
    expect(jpeg.type).toBe("image/jpeg");
    expect(close).toHaveBeenCalled();
  });
});

function solid(w: number, h: number, v: number) {
  return new Uint8ClampedArray(w * h * 4).fill(v);
}
function checker(w: number, h: number, lo: number, hi: number) {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = (x + y) % 2 ? hi : lo;
      a.set([v, v, v, 255], (y * w + x) * 4);
    }
  return a;
}
describe("quality", () => {
  it("rejects a dark image", () => {
    expect(assessPixels(checker(40, 40, 0, 30), 40, 40)).toMatchObject({
      ok: false,
      issue: "dark",
    });
  });
  it("rejects a flat (blurry) image", () => {
    expect(assessPixels(solid(40, 40, 128), 40, 40)).toMatchObject({ ok: false, issue: "blurry" });
  });
  it("accepts a bright, detailed image", () => {
    expect(assessPixels(checker(40, 40, 60, 220), 40, 40).ok).toBe(true);
  });
});

const hdr = (p: string) => new Headers({ "X-Provider": p });
describe("HostedProvider", () => {
  const img = new Blob(["abc"], { type: "image/jpeg" });
  it("returns findings for offered cues only and records the provider", async () => {
    const f = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            findings: [
              { cue: "a", confidence: 0.9 },
              { cue: "zzz", confidence: 0.9 },
              { cue: "b", confidence: 0.2 },
            ],
          }),
          { headers: hdr("gemini") },
        ),
    ) as unknown as typeof fetch;
    const p = new HostedProvider(f);
    expect(await p.detect(img, ["a", "b"])).toEqual([{ cue: "a", confidence: 0.9 }]);
    expect(p.provider).toBe("gemini");
  });
  it.each([
    [
      async () => {
        throw new TypeError("network");
      },
      "offline",
    ],
    [async () => new Response("{}", { status: 503 }), "unavailable"],
    [async () => Response.json({ error: "rate_limited" }, { status: 429 }), "rate_limited"],
    [async () => Response.json({ error: "daily_cap" }, { status: 429 }), "daily_cap"],
    [async () => Response.json({ error: "bad_output" }, { status: 502 }), "bad_output"],
    [async () => Response.json({ error: "provider_error" }, { status: 502 }), "provider_error"],
    [async () => Response.json({ nope: 1 }), "bad_output"],
  ] as const)("falls back with a DetectError (%#)", async (impl, code) => {
    const p = new HostedProvider(impl as unknown as typeof fetch);
    await expect(p.detect(img, ["a"])).rejects.toMatchObject({ code });
  });
  it("times out after the client limit", async () => {
    vi.useFakeTimers();
    const f = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) =>
          init.signal!.addEventListener("abort", () => rej(new Error("abort"))),
        ),
    ) as unknown as typeof fetch;
    const done = new HostedProvider(f).detect(img, ["a"]).catch((e: DetectError) => e.code);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS + 1);
    expect(await done).toBe("timeout");
    vi.useRealTimers();
  });
  it("status check: provider, none, offline", async () => {
    const ok = (async () =>
      new Response("{}", { headers: hdr("anthropic") })) as unknown as typeof fetch;
    expect(await providerStatus(ok)).toBe("anthropic");
    const no = (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch;
    expect(await providerStatus(no)).toBe("none");
    const off = (async () => {
      throw new TypeError("x");
    }) as unknown as typeof fetch;
    expect(await providerStatus(off)).toBe("offline");
  });
});

describe("scanPhoto and consent", () => {
  it("consent gates the photo option", () => {
    expect(mayScan({ perceptionConsent: false })).toBe(false);
    expect(mayScan({ perceptionConsent: true })).toBe(true);
  });
  it("an undecodable image is reported, and the provider is never called", async () => {
    vi.stubGlobal("createImageBitmap", async () => {
      throw new Error("bad");
    });
    const detect = vi.fn();
    await expect(scanPhoto(new Blob(["x"]), ["a"], { detect })).rejects.toBeInstanceOf(PhotoError);
    expect(detect).not.toHaveBeenCalled();
  });
  it("sample findings use offered cues, else the first two", () => {
    expect(sampleFindings(["blind_cord", "x"]).map((f) => f.cue)).toEqual(["blind_cord"]);
    expect(sampleFindings(["p", "q", "r"]).map((f) => f.cue)).toEqual(["p", "q"]);
  });
});

describe("HostedProvider default fetch", () => {
  it("calls the global fetch without binding it to the provider (browsers throw Illegal invocation otherwise)", async () => {
    const real = globalThis.fetch;
    let seenThis: unknown = "unset";
    globalThis.fetch = function (this: unknown) {
      seenThis = this;
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(
        new Response(JSON.stringify({ findings: [] }), {
          headers: { "X-Provider": "gemini", "Content-Type": "application/json" },
        }),
      );
    } as typeof fetch;
    try {
      const out = await new HostedProvider().detect(new Blob(["x"], { type: "image/jpeg" }), [
        "unanchored_tv",
      ]);
      expect(out).toEqual([]);
      expect(seenThis === undefined || seenThis === globalThis).toBe(true);
    } finally {
      globalThis.fetch = real;
    }
  });
});
