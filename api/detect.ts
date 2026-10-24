// Photo scan proxy (T9). Receives one resized JPEG and a list of allowed cue ids, asks a hosted vision model
// which of those cues are clearly visible, and returns validated findings. It stores nothing and logs nothing:
// no images, no findings, no keys. Keys come only from environment variables.
import { z } from "zod";

export type DetectErrorCode =
  | "method_not_allowed"
  | "forbidden"
  | "bad_request"
  | "rate_limited"
  | "daily_cap"
  | "no_provider"
  | "provider_error"
  | "bad_output";

export type ProviderName = "gemini" | "anthropic";

export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-5-5";
// Flash-class stable model listed on https://ai.google.dev/models on 2026-10-24. Override with GEMINI_MODEL.
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

const MAX_IMAGE_CHARS = 2_200_000; // ~1.6 MB of JPEG after base64
const MAX_FINDINGS = 12;
const MIN_CONFIDENCE = 0.5;
const PER_IP_LIMIT = 20;
const HOUR_MS = 60 * 60 * 1000;
const PROVIDER_TIMEOUT_MS = 12_000;

const BodySchema = z.object({
  image: z
    .string()
    .min(100)
    .max(MAX_IMAGE_CHARS)
    .regex(/^[A-Za-z0-9+/=]+$/),
  cues: z
    .array(z.string().regex(/^[a-z0-9_]{1,60}$/))
    .min(1)
    .max(80),
  lang: z.enum(["en", "es"]).default("en"),
});

const ModelItemSchema = z.object({
  cue: z.string(),
  confidence: z.number().min(0).max(1),
  note: z.string().optional(),
});
const ModelOutputSchema = z.array(ModelItemSchema);

export interface DetectDeps {
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
  now?: () => number;
}

// In-memory counters. On serverless these reset when an instance is recycled, which is acceptable here:
// they are a brake on accidents, and the provider's own quota is the hard limit.
const hits = new Map<string, number[]>();
let dayKey = "";
let dayCount = 0;

export function resetDetectLimits(): void {
  hits.clear();
  dayKey = "";
  dayCount = 0;
}

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });
}
const fail = (status: number, error: DetectErrorCode) => json(status, { error });

export function pickProvider(
  env: Record<string, string | undefined>,
): { name: ProviderName; key: string; model: string } | null {
  if (env.GEMINI_API_KEY)
    return {
      name: "gemini",
      key: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    };
  if (env.ANTHROPIC_API_KEY)
    return {
      name: "anthropic",
      key: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
    };
  return null;
}

export function buildPrompt(cues: string[]): string {
  return [
    "You are a visual reporter for a child-hazard checklist. Look at the photo of a room and report ONLY which of the allowed cues you can actually see.",
    "",
    "Allowed cues (use these exact strings, nothing else):",
    cues.join("\n"),
    "",
    "Rules:",
    "- Report only what is clearly visible in the photo. Do not guess about things out of frame.",
    "- Do NOT give advice, instructions, explanations of risk, or recommendations.",
    "- Do NOT say or imply that anything is safe, fine, or free of hazards.",
    "- If the image is not a room or contains any person, return [].",
    "- If you see none of the allowed cues, return an empty JSON array: []",
    '- Output ONLY a JSON array, no prose, no code fences. Each item has exactly these keys: "cue" (one allowed cue string), "confidence" (a number from 0 to 1), "note" (a short phrase, max 15 words, saying what you see and where).',
    "- Report each cue at most once.",
    "",
    'Example output: [{"cue": "blind_cord", "confidence": 0.8, "note": "looped cord hanging beside the left window"}]',
  ].join("\n");
}

async function callProvider(
  p: { name: ProviderName; key: string; model: string },
  image: string,
  prompt: string,
  doFetch: typeof fetch,
): Promise<string> {
  const signal = AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
  if (p.name === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:generateContent`;
    const res = await doFetch(url, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": p.key },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: image } }],
          },
        ],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) throw new Error("provider status");
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return (data.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? "").join("");
  }
  const res = await doFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": p.key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: p.model,
      max_tokens: 1000,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error("provider status");
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).map((x) => (x.type === "text" ? (x.text ?? "") : "")).join("");
}

// Model text -> findings. Throws when the text is not the JSON array we asked for.
export function parseFindings(text: string, allowed: string[]) {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const raw: unknown = JSON.parse(stripped);
  const items = ModelOutputSchema.parse(raw);
  const ok = new Set(allowed);
  const seen = new Set<string>();
  const out: { cue: string; confidence: number; note?: string }[] = [];
  for (const it of items) {
    if (!ok.has(it.cue) || it.confidence < MIN_CONFIDENCE || seen.has(it.cue)) continue;
    seen.add(it.cue);
    out.push(
      it.note ? { ...it, note: it.note.slice(0, 120) } : { cue: it.cue, confidence: it.confidence },
    );
    if (out.length >= MAX_FINDINGS) break;
  }
  return out;
}

export async function POST(request: Request, deps: DetectDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const now = (deps.now ?? Date.now)();
  if (request.method !== "POST") return fail(405, "method_not_allowed");

  // Same-origin only: no CORS headers are ever sent, and a cross-site browser request is refused.
  const origin = request.headers.get("origin");
  if (origin) {
    let same = false;
    try {
      same = new URL(origin).host === (request.headers.get("host") ?? new URL(request.url).host);
    } catch {
      same = false;
    }
    if (!same) return fail(403, "forbidden");
  }

  const provider = pickProvider(env);
  if (!provider) return fail(503, "no_provider");

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return fail(400, "bad_request");
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "unknown";
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
  if (recent.length >= PER_IP_LIMIT) {
    hits.set(ip, recent);
    return fail(429, "rate_limited");
  }
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== dayKey) {
    dayKey = today;
    dayCount = 0;
  }
  const cap = Number(env.DAILY_CAP ?? 300);
  if (dayCount >= (Number.isFinite(cap) && cap >= 0 ? cap : 300)) return fail(429, "daily_cap");
  recent.push(now);
  hits.set(ip, recent);
  dayCount += 1;

  const headers = { "X-Provider": provider.name };
  let text: string;
  try {
    text = await callProvider(provider, body.image, buildPrompt(body.cues), deps.fetch ?? fetch);
  } catch {
    return json(502, { error: "provider_error" satisfies DetectErrorCode }, headers);
  }
  try {
    return json(
      200,
      { findings: parseFindings(text, body.cues), provider: provider.name },
      headers,
    );
  } catch {
    return json(502, { error: "bad_output" satisfies DetectErrorCode }, headers);
  }
}
