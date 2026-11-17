import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const probeUrl = pathToFileURL(fileURLToPath(new URL("../../lib/probe.ts", import.meta.url))).href;
const formatUrl = pathToFileURL(fileURLToPath(new URL("../../lib/format.ts", import.meta.url))).href;

const probeMod = await import(probeUrl);
const formatMod = await import(formatUrl);

let calls = 0;
const original = probeMod.probe;

function countedProbe() {
  calls += 1;
  return original();
}

const parsed = formatMod.parseFormatArgs(process.argv.slice(2));
if (!parsed.ok) {
  process.stderr.write(parsed.error);
  process.exit(1);
}

const result = countedProbe();
if (parsed.format === "text") {
  process.stdout.write(formatMod.formatText(result));
} else {
  process.stdout.write(formatMod.formatJson(result));
}
process.stderr.write(JSON.stringify({ calls }) + "\n");
