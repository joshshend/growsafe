// CLI: validate src/help/resources.json. Exits 1 with a readable list on any error.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateHelp } from "../src/help/schema";

const file = join(import.meta.dirname, "..", "src", "help", "resources.json");
let issues;
try {
  issues = validateHelp(JSON.parse(readFileSync(file, "utf8")));
} catch (err) {
  issues = [{ id: "?", message: `could not read JSON: ${String(err)}` }];
}
if (issues.length) {
  for (const i of issues) console.error(`resources.json [${i.id}]: ${i.message}`);
  console.error(`\nhelp:validate FAILED: ${issues.length} error(s).`);
  process.exit(1);
}
console.log("help:validate OK.");
