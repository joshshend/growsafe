// Calls our own /api/detect proxy. The photo goes to the model provider through it and is not stored by GrowSafe.
import { z } from "zod";
import { FindingSchema, type Finding } from "../kb/schema";
import { DetectError, type PerceptionProvider } from "./provider";

export const DETECT_URL = "/api/detect";
export const TIMEOUT_MS = 15_000;

export type ProviderName = "gemini" | "anthropic";
export type ProviderStatus = ProviderName | "none" | "offline";

const providerOf = (h: string | null): ProviderName | null =>
  h === "gemini" || h === "anthropic" ? h : null;

// Which provider the server uses, "none" when the server has no key (the feature should stay hidden),
// "offline" when we could not reach it at all.
export async function providerStatus(f: typeof fetch = fetch): Promise<ProviderStatus> {
  try {
    const res = await f(DETECT_URL, { method: "GET", cache: "no-store" });
    if (res.status === 404 || res.status === 503) return "none";
    return providerOf(res.headers.get("X-Provider")) ?? "none";
  } catch {
    return "offline";
  }
}

export function blobToBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.readAsDataURL(b);
  });
}

const ResponseSchema = z.object({ findings: z.array(FindingSchema) });

export class HostedProvider implements PerceptionProvider {
  provider: ProviderName | null = null; // set from X-Provider after a successful call
  // Wrap the global fetch: browsers throw "Illegal invocation" if window.fetch is called as a method of another object.
  constructor(private f: typeof fetch = (input, init) => fetch(input, init)) {}

  async detect(img: Blob, cues: string[], lang: "en" | "es" = "en"): Promise<Finding[]> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const call = this.f;
      const res = await call(DETECT_URL, {
        method: "POST",
        signal: ctl.signal,
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: await blobToBase64(img), cues, lang }),
      });
      this.provider = providerOf(res.headers.get("X-Provider")) ?? this.provider;
      if (res.status === 503 || res.status === 404) throw new DetectError("unavailable");
      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new DetectError(body.error === "daily_cap" ? "daily_cap" : "rate_limited");
      }
      if (res.status === 502) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new DetectError(body.error === "bad_output" ? "bad_output" : "provider_error");
      }
      if (!res.ok) throw new DetectError("provider_error");
      const parsed = ResponseSchema.safeParse(await res.json().catch(() => null));
      if (!parsed.success) throw new DetectError("bad_output");
      const ok = new Set(cues);
      return parsed.data.findings.filter((x) => ok.has(x.cue) && x.confidence >= 0.5);
    } catch (e) {
      if (e instanceof DetectError) throw e;
      if (ctl.signal.aborted) throw new DetectError("timeout");
      throw new DetectError("offline");
    } finally {
      clearTimeout(timer);
    }
  }
}
