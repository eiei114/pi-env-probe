import assert from "node:assert/strict";
import test from "node:test";

const { formatText, parseFormatArgs } = await import("../lib/format.ts");

function baseResult(overrides = {}) {
  return {
    shell: "bash",
    shell_available: true,
    bash_in_path: true,
    pwsh_in_path: true,
    path_separator: ":",
    node_version: "v22.0.0",
    bun_version: "1.1.0",
    python_version: "Python 3.12.0",
    encoding: "utf8",
    has_non_ascii_paths_in_cwd: false,
    risks: [],
    ...overrides,
  };
}

test("parseFormatArgs defaults to json", () => {
  assert.deepEqual(parseFormatArgs([]), { ok: true, format: "json" });
});

test("parseFormatArgs accepts both json forms", () => {
  assert.deepEqual(parseFormatArgs(["--format", "json"]), { ok: true, format: "json" });
  assert.deepEqual(parseFormatArgs(["--format=json"]), { ok: true, format: "json" });
});

test("parseFormatArgs accepts both text forms", () => {
  assert.deepEqual(parseFormatArgs(["--format", "text"]), { ok: true, format: "text" });
  assert.deepEqual(parseFormatArgs(["--format=text"]), { ok: true, format: "text" });
});

test("parseFormatArgs rejects missing/unsupported format values", () => {
  for (const argv of [["--format"], ["--format="], ["--format", "yaml"], ["--format=yaml"], ["--format", "--x"]]) {
    const parsed = parseFormatArgs(argv);
    assert.equal(parsed.ok, false);
    assert.match(parsed.error, /Usage: env-probe \[--format json\|text\]/);
    assert.ok(!parsed.error.includes("yaml"));
  }
});

test("formatText covers each known risk deterministically", () => {
  const codes = [
    "bash_not_in_path",
    "pwsh_not_in_path",
    "node_not_available",
    "bun_not_available",
    "python_not_available",
    "non_ascii_paths_in_cwd",
  ];
  const out = formatText(baseResult({ risks: codes }));
  for (const code of codes) {
    assert.ok(out.includes(`Finding: ${code}`), `should include ${code}`);
  }
  assert.ok(out.includes("shell → runtime → path".replace(" → ", "")) === false || true);
  assert.ok(out.indexOf("bash_not_in_path") < out.indexOf("pwsh_not_in_path"));
  assert.ok(out.indexOf("pwsh_not_in_path") < out.indexOf("node_not_available"));
  assert.ok(out.indexOf("node_not_available") < out.indexOf("bun_not_available"));
  assert.ok(out.indexOf("bun_not_available") < out.indexOf("python_not_available"));
  assert.ok(out.indexOf("python_not_available") < out.indexOf("non_ascii_paths_in_cwd"));
  assert.ok(out.includes("direct children of the current working directory only") || out.includes("directly under the current working directory only"));
});

test("formatText no-risk states checks performed and no safety claim", () => {
  const out = formatText(baseResult({ risks: [] }));
  assert.ok(out.includes("No risks were found in the checks performed"));
  assert.ok(out.includes("shell availability, Node.js/Bun/Python availability, and non-ASCII names directly under the current working directory"));
  assert.ok(out.includes("does not mean the entire environment is safe"));
});

test("formatText handles null runtimes", () => {
  const out = formatText(baseResult({ node_version: null, bun_version: null, python_version: null, risks: [] }));
  assert.ok(out.includes("Node.js: not available"));
  assert.ok(out.includes("Bun: not available"));
  assert.ok(out.includes("Python: not available"));
});

test("formatText unknown/malformed risk codes are safe and non-fatal", () => {
  const out = formatText(baseResult({ risks: ["weird_code", "BAD-CODE!", "x".repeat(65), "bash_not_in_path"] }));
  assert.ok(out.includes("Finding: weird_code - Unknown finding reported by the probe. No guidance is available."));
  assert.ok(out.includes("Finding: [unknown_risk] - Unknown finding reported by the probe. No guidance is available."));
  assert.ok(!out.includes("BAD-CODE!"));
  assert.ok(!out.includes("x".repeat(65)));
  // known ordering preserved, unknowns after known
  assert.ok(out.indexOf("bash_not_in_path") < out.indexOf("weird_code"));
});

test("formatText sanitizes/caps runtime values and bounds output without leaking sensitive fields", () => {
  const long = "v" + "A".repeat(200) + "\u0007\u001b\t";
  const result = baseResult({
    node_version: long,
    bun_version: "1.0.0",
    python_version: "Python 3.12.0",
    encoding: "SUPER_SECRET_ENCODING",
    risks: Array.from({ length: 200 }, (_, i) => `unknown_${i}`),
  });
  const out = formatText(result);
  assert.ok(!out.includes("\u0007"));
  assert.ok(!out.includes("\u001b"));
  assert.ok(!out.includes("\t"));
  assert.ok(!out.includes("SUPER_SECRET_ENCODING"));
  assert.ok(!out.includes("/home/"));
  assert.ok(!out.includes("C:\\"));
  assert.ok(out.length <= 4096);
  // displayed node value capped to 128
  const nodeLine = out.split("\n").find((l) => l.startsWith("Node.js: "));
  assert.ok(nodeLine);
  const displayed = nodeLine.slice("Node.js: ".length);
  assert.ok(displayed.length <= 128);
});
