// Recall lookup against the CPSC Recalls REST API (saferproducts.gov). Everything here is a "possible match":
// the brand is matched on the device, and the notice's model number decides. Never says a product is fine.
import { z } from "zod";
import { kindOf } from "./products";
import { RecallMatchSchema, type GearType, type RecallMatch } from "./types";

export const SAFERPRODUCTS_URL = "https://www.saferproducts.gov/";
export const DIRECT_URL = "https://www.saferproducts.gov/RestWebServices/Recall";
export const PROXY_URL = "/api/recalls"; // api/recalls.ts: forwards only the search text
export const RECHECK_MS = 24 * 60 * 60 * 1000; // re-check on app open at most once a day
const MAX_MATCHES = 10;

const Named = z.array(z.object({ Name: z.string().nullish() }).passthrough()).nullish();
const RecordSchema = z
  .object({
    RecallID: z.union([z.number(), z.string()]),
    RecallNumber: z.string().nullish(),
    RecallDate: z.string().nullish(),
    Title: z.string().nullish(),
    URL: z.string().nullish(),
    Description: z.string().nullish(),
    Products: z
      .array(z.object({ Name: z.string().nullish(), Model: z.string().nullish() }).passthrough())
      .nullish(),
    Hazards: Named,
    Manufacturers: Named,
    Importers: Named,
    Retailers: Named,
  })
  .passthrough();
export type CpscRecall = z.infer<typeof RecordSchema>;

// Reads the API's JSON array. Throws when the body is not an array; skips records that do not parse.
export function parseRecalls(json: unknown): CpscRecall[] {
  if (!Array.isArray(json)) throw new Error("unexpected recall response");
  const out: CpscRecall[] = [];
  for (const r of json) {
    const p = RecordSchema.safeParse(r);
    if (p.success) out.push(p.data);
  }
  return out;
}

// Lowercase letters and digits only, words separated by single spaces ("Fisher-Price" -> "fisher price").
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function haystack(r: CpscRecall): string {
  const names = (l: CpscRecall["Hazards"]) => (l ?? []).map((x) => x.Name ?? "");
  return norm(
    [
      r.Title ?? "",
      r.Description ?? "",
      ...(r.Products ?? []).flatMap((p) => [p.Name ?? "", p.Model ?? ""]),
      ...names(r.Manufacturers),
      ...names(r.Importers),
      ...names(r.Retailers),
    ].join(" "),
  );
}

export interface GearQuery {
  brand: string;
  type: GearType;
  model?: string;
}

// Keeps recalls whose notice mentions the brand. The model only adds a "model appears" note.
export function matchRecalls(recalls: CpscRecall[], q: GearQuery): RecallMatch[] {
  const brand = norm(q.brand);
  if (!brand) return [];
  const model = norm(q.model ?? "");
  const seen = new Set<string>();
  const out: RecallMatch[] = [];
  for (const r of recalls) {
    const hay = ` ${haystack(r)} `;
    if (!hay.includes(` ${brand} `)) continue;
    const id = String(r.RecallID);
    const url = r.URL ?? "";
    if (seen.has(id) || !url.startsWith("https://") || !r.Title) continue;
    seen.add(id);
    out.push(
      RecallMatchSchema.parse({
        recallId: id,
        recallNumber: r.RecallNumber ?? "",
        title: r.Title,
        date: (r.RecallDate ?? "").slice(0, 10),
        hazard: (r.Hazards?.[0]?.Name ?? "").slice(0, 220),
        url,
        modelMentioned: model.length >= 2 && hay.includes(` ${model} `),
      }),
    );
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out.slice(0, MAX_MATCHES);
}

export type Fetcher = (url: string) => Promise<Response>;
export interface ClientDeps {
  fetchImpl?: Fetcher;
  now?: Date;
}

// One term, through the proxy first and then straight to the CPSC API (works only if it allows CORS).
async function fetchTerm(term: string, f: Fetcher): Promise<CpscRecall[]> {
  const enc = encodeURIComponent(term);
  const urls = [`${PROXY_URL}?q=${enc}`, `${DIRECT_URL}?format=json&ProductName=${enc}`];
  let last: unknown = new Error("no attempt");
  for (const url of urls) {
    try {
      const res = await f(url);
      if (!res.ok) throw new Error(`recall service answered ${res.status}`);
      return parseRecalls(await res.json());
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

export type RecallOutcome =
  | { ok: true; checkedAt: string; matches: RecallMatch[] }
  | { ok: false; reason: "offline" };

// Searches every term for the gear type and keeps matches for the brand. Any failure -> { ok: false }.
export async function checkRecalls(q: GearQuery, deps: ClientDeps = {}): Promise<RecallOutcome> {
  const f: Fetcher = deps.fetchImpl ?? ((u) => fetch(u));
  try {
    const all: CpscRecall[] = [];
    for (const term of kindOf(q.type).terms) all.push(...(await fetchTerm(term, f)));
    return {
      ok: true,
      checkedAt: (deps.now ?? new Date()).toISOString(),
      matches: matchRecalls(all, q),
    };
  } catch {
    return { ok: false, reason: "offline" };
  }
}

// True when the item was never checked, or the last successful check is a day old or more.
export function shouldRecheck(lastChecked: string | undefined, now: Date): boolean {
  if (!lastChecked) return true;
  const t = Date.parse(lastChecked);
  return Number.isNaN(t) || now.getTime() - t >= RECHECK_MS;
}
