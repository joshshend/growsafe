// Trims CPSC recall records to the fields GrowSafe uses, so the proxy response stays small.
// Pure and shared by api/recalls.ts and the tests.
type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): Rec[] => (Array.isArray(v) ? v.filter(isRec) : []);
const str = (v: unknown, max = 400): string => (typeof v === "string" ? v.slice(0, max) : "");
const names = (v: unknown, key: string, max = 12): { [k: string]: string }[] =>
  list(v)
    .slice(0, max)
    .map((r) => ({ [key]: str(r[key], 200) }));

export function slimRecalls(json: unknown): Rec[] {
  if (!Array.isArray(json)) return [];
  return list(json).map((r) => ({
    RecallID: r.RecallID,
    RecallNumber: str(r.RecallNumber, 40),
    RecallDate: str(r.RecallDate, 40),
    Title: str(r.Title, 300),
    URL: str(r.URL, 600),
    Description: str(r.Description, 500),
    Products: list(r.Products)
      .slice(0, 12)
      .map((p) => ({ Name: str(p.Name, 200), Model: str(p.Model, 100) })),
    Hazards: names(r.Hazards, "Name"),
    Manufacturers: names(r.Manufacturers, "Name"),
    Importers: names(r.Importers, "Name"),
    Retailers: names(r.Retailers, "Name"),
  }));
}
