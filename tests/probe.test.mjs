import assert from "node:assert/strict";
import test from "node:test";

const { probe } = await import("../lib/probe.ts");

test("probe returns required fields", () => {
  const result = probe();
  assert.ok("shell" in result);
  assert.ok("shell_available" in result);
  assert.ok("bash_in_path" in result);
  assert.ok("pwsh_in_path" in result);
  assert.ok("path_separator" in result);
  assert.ok("node_version" in result);
  assert.ok("bun_version" in result);
  assert.ok("python_version" in result);
  assert.ok("encoding" in result);
  assert.ok("risks" in result);
});

test("probe never throws", () => {
  assert.doesNotThrow(() => probe());
});

test("path_separator matches platform", () => {
  const result = probe();
  const expected = process.platform === "win32" ? ";" : ":";
  assert.equal(result.path_separator, expected);
});

test("shell_available is boolean", () => {
  assert.equal(typeof probe().shell_available, "boolean");
});

test("bash_in_path and pwsh_in_path are booleans", () => {
  const result = probe();
  assert.equal(typeof result.bash_in_path, "boolean");
  assert.equal(typeof result.pwsh_in_path, "boolean");
});

test("runtime version fields are string or null", () => {
  const result = probe();
  for (const field of ["node_version", "bun_version", "python_version"]) {
    const value = result[field];
    assert.ok(value === null || typeof value === "string");
  }
});

test("encoding is a non-empty string from process.env", () => {
  const result = probe();
  assert.equal(typeof result.encoding, "string");
  assert.ok(result.encoding.length > 0);
  const expected =
    process.env.LC_CTYPE || process.env.LANG || "utf8";
  assert.equal(result.encoding, expected);
});

test("risks is an array of strings", () => {
  const result = probe();
  assert.ok(Array.isArray(result.risks));
  for (const risk of result.risks) {
    assert.equal(typeof risk, "string");
  }
});

test("risks includes availability flags for missing runtimes", () => {
  const result = probe();
  if (result.node_version === null) {
    assert.ok(result.risks.includes("node_not_available"));
  }
  if (result.bun_version === null) {
    assert.ok(result.risks.includes("bun_not_available"));
  }
  if (result.python_version === null) {
    assert.ok(result.risks.includes("python_not_available"));
  }
});

test("node_version is populated when node is available", () => {
  const result = probe();
  assert.ok(result.node_version !== null);
  assert.match(result.node_version, /^v\d+/);
});
