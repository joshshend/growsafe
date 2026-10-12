// CLI: validate every src/kb/data/*.json. Exits 1 with a readable list on any error.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateEntries } from "../src/kb/validate";

const dir = join(import.meta.dirname, "..", "src", "kb", "data");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
const items = files.map((file) => {
  try {
    return { file, data: JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown };
  } catch (err) {
    return { file, data: { __parseError: String(err) } };
  }
});
const errors = validateEntries(items);
if (errors.length) {
  for (const e of errors) console.error(`${e.file} [${e.id}]: ${e.message}`);
  console.error(`\nkb:validate FAILED: ${errors.length} error(s) in ${files.length} file(s).`);
  process.exit(1);
}
console.log(`kb:validate OK: ${files.length} file(s).`);
