// Stateless forwarder for the CPSC recall list (kept so a browser CORS rule can never block the check).
// It only passes the search text (?q=) to saferproducts.gov, stores nothing and logs nothing.
import { slimRecalls } from "../src/recalls/slim";

const UPSTREAM = "https://www.saferproducts.gov/RestWebServices/Recall";
const TERM = /^[\p{L}\p{N}][\p{L}\p{N} '-]{1,39}$/u;
const DAY = 24 * 60 * 60;

export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!TERM.test(q)) return Response.json({ error: "bad query" }, { status: 400 });
  try {
    const res = await fetch(`${UPSTREAM}?format=json&ProductName=${encodeURIComponent(q)}`);
    if (!res.ok) return Response.json({ error: "upstream" }, { status: 502 });
    const body = slimRecalls(await res.json());
    return Response.json(body, {
      headers: { "Cache-Control": `public, s-maxage=${DAY}, stale-while-revalidate=${DAY}` },
    });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
