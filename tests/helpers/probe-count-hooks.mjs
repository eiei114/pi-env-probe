import path from "node:path";
import { pathToFileURL } from "node:url";

const spyUrl = pathToFileURL(path.resolve("tests/helpers/probe-count-hooks.mjs")).href.replace(/probe-count-hooks\.mjs$/, "probe-spy.mjs");

function isProbeModule(url) {
  try {
    if (!url.startsWith("file:")) return false;
    const file = decodeURIComponent(new URL(url).pathname).replace(/^\/([A-Za-z]:)/, "$1").replace(/\\/g, "/");
    return file.toLowerCase().endsWith("/lib/probe.ts");
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  if (isProbeModule(resolved.url) && context.parentURL !== spyUrl && !resolved.url.includes("__real_probe__=1")) {
    return { url: spyUrl, shortCircuit: true };
  }
  return resolved;
}
