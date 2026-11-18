import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const hooksUrl = pathToFileURL(path.resolve("tests/helpers/probe-count-hooks.mjs")).href;
register(hooksUrl, import.meta.url);

process.on("exit", () => {
  const out = process.env.PI_ENV_PROBE_COUNT_OUT;
  if (!out) return;
  try {
    const calls = globalThis.__piEnvProbeCalls ?? 0;
    fs.writeFileSync(out, String(calls), "utf8");
  } catch {
    // ignore
  }
});
