import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, parseFindings, pickProvider, resetDetectLimits } from "../../api/detect";

const IMG = "A".repeat(400);
const CUES = ["blind_cord", "uncovered_outlet", "stairs_no_gate"];
const req = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://growsafe.test/api/detect", {
    method: "POST",
    headers: { "content-type": "application/json", host: "growsafe.test", ...headers },
    body: JSON.stringify(body),
  });
const good = { image: IMG, cues: CUES, lang: "en" };
const gemini = (text: string) =>
  vi.fn(async () =>
    Response.json({ candidates: [{ content: { parts: [{ text }] } }] }),
  ) as unknown as typeof fetch;
const claude = (text: string) =>
  vi.fn(async () =>
    Response.json({ content: [{ type: "text", text }] }),
  ) as unknown as typeof fetch;

beforeEach(() => resetDetectLimits());

describe("provider selection", () => {
  it("prefers Gemini, then Anthropic, else none", () => {
    expect(pickProvider({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" })?.name).toBe("gemini");
    expect(pickProvider({ ANTHROPIC_API_KEY: "a" })).toMatchObject({
      name: "anthropic",
      model: "claude-haiku-5-5",
    });
    expect(
      pickProvider({ ANTHROPIC_API_KEY: "a", ANTHROPIC_MODEL: "claude-sonnet-5-5" })?.model,
    ).toBe("claude-sonnet-5-5");
    expect(pickProvider({ GEMINI_API_KEY: "g", GEMINI_MODEL: "m" })?.model).toBe("m");
    expect(pickProvider({})).toBeNull();
  });
  it("no key gives 503 no_provider and never calls out", async () => {
    const f = vi.fn();
    const res = await POST(req(good), { env: {}, fetch: f as unknown as typeof fetch });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "no_provider" });
    expect(f).not.toHaveBeenCalled();
  });
  it("sends the key in a header to the chosen provider only", async () => {
    const g = gemini("[]");
    await POST(req(good), { env: { GEMINI_API_KEY: "gk" }, fetch: g });
    const [url, init] = (g as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).not.toContain("gk");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("gk");
    const c = claude("[]");
    await POST(req(good), { env: { ANTHROPIC_API_KEY: "ak" }, fetch: c });
    const [url2, init2] = (c as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url2).toContain("api.anthropic.com");
    expect((init2.headers as Record<string, string>)["x-api-key"]).toBe("ak");
  });
});

describe("handler", () => {
  const env = { GEMINI_API_KEY: "k" };
  it("returns validated findings with no-store and X-Provider", async () => {
    const f = gemini(
      JSON.stringify([
        { cue: "blind_cord", confidence: 0.9, note: "cord by window" },
        { cue: "uncovered_outlet", confidence: 0.4 },
        { cue: "made_up_cue", confidence: 0.99 },
        { cue: "blind_cord", confidence: 0.8 },
      ]),
    );
    const res = await POST(req(good), { env, fetch: f });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Provider")).toBe("gemini");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect((await res.json()).findings).toEqual([
      { cue: "blind_cord", confidence: 0.9, note: "cord by window" },
    ]);
  });
  it("accepts fenced JSON from Anthropic", async () => {
    const res = await POST(req(good), {
      env: { ANTHROPIC_API_KEY: "a" },
      fetch: claude('```json\n[{"cue":"stairs_no_gate","confidence":0.7}]\n```'),
    });
    expect((await res.json()).findings).toEqual([{ cue: "stairs_no_gate", confidence: 0.7 }]);
  });
  it("rejects malformed model output with 502 bad_output", async () => {
    for (const bad of [
      "sorry, I cannot",
      '{"cue":"blind_cord"}',
      '[{"cue":"blind_cord","confidence":"high"}]',
    ]) {
      const res = await POST(req(good), { env, fetch: gemini(bad) });
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "bad_output" });
    }
  });
  it("maps provider failure to 502 provider_error", async () => {
    const f = vi.fn(async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    expect((await POST(req(good), { env, fetch: f })).status).toBe(502);
    const t = vi.fn(async () => {
      throw new Error("net");
    }) as unknown as typeof fetch;
    expect(await (await POST(req(good), { env, fetch: t })).json()).toEqual({
      error: "provider_error",
    });
  });
  it("rejects bad input and cross-origin requests", async () => {
    const f = gemini("[]");
    expect((await POST(req({ ...good, image: "x" }), { env, fetch: f })).status).toBe(400);
    expect((await POST(req({ ...good, cues: [] }), { env, fetch: f })).status).toBe(400);
    expect(
      (await POST(req({ ...good, image: "A".repeat(2_300_000) }), { env, fetch: f })).status,
    ).toBe(400);
    const cross = await POST(req(good, { origin: "https://evil.example" }), { env, fetch: f });
    expect(cross.status).toBe(403);
    const same = await POST(req(good, { origin: "https://growsafe.test" }), { env, fetch: f });
    expect(same.status).toBe(200);
    const put = await POST(new Request("https://growsafe.test/api/detect", { method: "PUT" }), {
      env,
      fetch: f,
    });
    expect(put.status).toBe(405);
  });
  it("caps findings at 12", () => {
    const cues = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const out = parseFindings(JSON.stringify(cues.map((cue) => ({ cue, confidence: 0.9 }))), cues);
    expect(out).toHaveLength(12);
  });
});

describe("status check", () => {
  it("GET reports the provider without calling it, or 503 without a key", async () => {
    const f = vi.fn();
    const url = "https://growsafe.test/api/detect";
    const ok = await POST(new Request(url), {
      env: { ANTHROPIC_API_KEY: "a" },
      fetch: f as unknown as typeof fetch,
    });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("X-Provider")).toBe("anthropic");
    expect((await POST(new Request(url), { env: {} })).status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("limits", () => {
  const env = { GEMINI_API_KEY: "k" };
  it("limits one IP to 20 an hour, then frees it", async () => {
    let t = Date.UTC(2026, 9, 24, 12);
    const f = gemini("[]");
    const go = (ip: string) =>
      POST(req(good, { "x-forwarded-for": ip }), {
        env: { ...env, DAILY_CAP: "1000" },
        fetch: f,
        now: () => t,
      });
    for (let i = 0; i < 20; i++) expect((await go("1.1.1.1")).status).toBe(200);
    const blocked = await go("1.1.1.1");
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: "rate_limited" });
    expect((await go("2.2.2.2")).status).toBe(200);
    t += 61 * 60 * 1000;
    expect((await go("1.1.1.1")).status).toBe(200);
  });
  it("applies a global daily cap and resets next day", async () => {
    let t = Date.UTC(2026, 9, 24, 12);
    const f = gemini("[]");
    const go = (ip: string) =>
      POST(req(good, { "x-forwarded-for": ip }), {
        env: { ...env, DAILY_CAP: "2" },
        fetch: f,
        now: () => t,
      });
    expect((await go("a")).status).toBe(200);
    expect((await go("b")).status).toBe(200);
    const res = await go("c");
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "daily_cap" });
    t += 24 * 60 * 60 * 1000;
    expect((await go("c")).status).toBe(200);
  });
  it("does not call the provider once over the cap", async () => {
    const f = gemini("[]");
    await POST(req(good), { env: { ...env, DAILY_CAP: "0" }, fetch: f });
    expect(f).not.toHaveBeenCalled();
  });
});

describe("blank env values from a copied .env.example", () => {
  it("treats blank DAILY_CAP, GEMINI_MODEL and ANTHROPIC_KEY as unset", async () => {
    const g = gemini("[]");
    const res = await POST(req(good), {
      env: {
        GEMINI_API_KEY: "gk",
        GEMINI_MODEL: "",
        DAILY_CAP: "",
        ANTHROPIC_API_KEY: "",
        ANTHROPIC_MODEL: "",
      },
      fetch: g,
    });
    expect(res.status).toBe(200);
    const [url] = (g as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("/models/gemini-");
  });
});

describe("Vercel method exports", () => {
  it("exports a GET handler that answers the status check", async () => {
    const mod = await import("../../api/detect");
    expect(typeof mod.GET).toBe("function");
    const res = await mod.GET(new Request("https://x.test/api/detect"));
    expect([200, 503]).toContain(res.status);
  });
});
