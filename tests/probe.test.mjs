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
