// Demo (npm run plan:demo): ranks the real KB for a 9-month-old and a 20-month-old and prints the top 10.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HazardEntrySchema, type Child, type Home } from "../src/kb/schema";
import { ageMonths, nextUnlocks, rankHazards } from "../src/plan";

const dir = join(import.meta.dirname, "..", "src", "kb", "data");
const kb = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => HazardEntrySchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));

const now = new Date();
// Birth month/year chosen so each child is the right age today (age assumes a birthday on the 15th).
function childAged(id: string, nickname: string, months: number): Child {
  const d = new Date(now.getFullYear(), now.getMonth() - months - (now.getDate() < 15 ? 1 : 0), 1);
  return { id, nickname, birth_month: d.getMonth() + 1, birth_year: d.getFullYear() };
}
const children = [childAged("c1", "Baby", 9), childAged("c2", "Toddler", 20)];
const home: Home = {
  id: "h1",
  name: "Home",
  rooms: ["living_room", "bedroom", "nursery", "kitchen", "bathroom", "stairs"],
};

console.log(`KB entries: ${kb.length}, home rooms: ${home.rooms.join(", ")}`);
for (const child of children) {
  console.log(`\n=== ${child.nickname}, ${ageMonths(child, now)} months ===`);
  const ranked = rankHazards(kb, child, now, { rooms: home.rooms }).slice(0, 10);
  if (ranked.length === 0) console.log("(no hazards apply)");
  ranked.forEach((r, i) => {
    console.log(`${i + 1}. ${r.hazard.name} [${r.status}] score ${r.score}`);
    for (const reason of r.reasons) {
      console.log(`     - ${reason.kind}: ${reason.text} ${JSON.stringify(reason.params)}`);
    }
  });
  const soon = nextUnlocks(kb, child, now, 6);
  if (soon.length) {
    console.log(
      "  Coming up in 6 months: " +
        soon.map((r) => `${r.hazard.name} (${r.unlocksInMonths}m)`).join(", "),
    );
  }
}
