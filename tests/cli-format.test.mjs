import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const cliPath = fileURLToPath(new URL("../bin/env-probe.js", import.meta.url));

function runCli(args = [], env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("CLI default emits existing JSON shape", () => {
  const res = runCli([]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stderr, "");
  const parsed = JSON.parse(res.stdout);
  assert.ok("shell" in parsed && "risks" in parsed && "encoding" in parsed);
});

test("CLI --format json and --format=json emit existing JSON behavior", () => {
  for (const args of [["--format", "json"], ["--format=json"]]) {
    const res = runCli(args);
    assert.equal(res.status, 0, res.stderr);
    const parsed = JSON.parse(res.stdout);
    assert.ok(Array.isArray(parsed.risks));
    assert.ok("node_version" in parsed);
  }
});

test("CLI --format text and --format=text emit readable non-JSON output", () => {
  for (const args of [["--format", "text"], ["--format=text"]]) {
    const res = runCli(args);
    assert.equal(res.status, 0, res.stderr);
    assert.throws(() => JSON.parse(res.stdout), /JSON|Unexpected/);
    assert.match(res.stdout, /^Shell: /m);
    assert.match(res.stdout, /^Node\.js: /m);
  }
});

test("CLI invalid/missing format values produce non-zero stderr usage with no stdout", () => {
  for (const args of [["--format"], ["--format="], ["--format", "yaml"], ["--format=yaml"]]) {
    const res = runCli(args);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /Usage: env-probe \[--format json\|text\]/);
    assert.ok(!res.stderr.includes("yaml"));
    assert.equal(res.stdout, "");
  }
});

test("CLI single-probe-call invariant for json and text modes", () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-env-probe-count-"));
  try {
    for (const modeArgs of [[], ["--format", "json"], ["--format", "text"]]) {
      const countFile = join(dir, `count-${modeArgs.join("-") || "default"}.txt`);
      const res = runCli(modeArgs, { PI_ENV_PROBE_COUNT_FILE: countFile });
      assert.equal(res.status, 0, res.stderr || res.stdout);
      const lines = readFileSync(countFile, "utf8").trim().split(/\r?\n/).filter(Boolean);
      assert.equal(lines.length, 1, `expected one probe() call for args ${JSON.stringify(modeArgs)}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
