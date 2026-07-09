import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const { probe } = await import("../lib/probe.ts");
const cliPath = fileURLToPath(new URL("../bin/env-probe.js", import.meta.url));

const timeoutHarnessPath = fileURLToPath(
  new URL("./helpers/probe-timeout-harness.mjs", import.meta.url),
);
const isolationHarnessPath = fileURLToPath(
  new URL("./helpers/probe-isolation-harness.mjs", import.meta.url),
);
const neverThrowsHarnessPath = fileURLToPath(
  new URL("./helpers/probe-never-throws-harness.mjs", import.meta.url),
);

/**
 * Run probe() in a child process with PATH cleared and minimal env vars.
 */
function runProbeInSanitizedEnv() {
  const env = {
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    PATH: "",
  };
  const script = `import { probe } from "./lib/probe.ts"; console.log(JSON.stringify(probe()));`;
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "-e", script],
    { cwd: repoRoot, env, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

/**
 * Create a temporary directory, chdir into it for `fn`, then restore CWD.
 */
function withTempCwd(fn) {
  const dir = mkdtempSync(join(tmpdir(), "pi-env-probe-"));
  const original = process.cwd();
  process.chdir(dir);
  try {
    return fn(dir);
  } finally {
    process.chdir(original);
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Temporarily override process.env keys, run `fn`, then restore prior values.
 */
function withEnv(overrides, fn) {
  const saved = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    const value = overrides[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(overrides)) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
}

test("empty environment degrades shell and runtime fields", () => {
  const result = runProbeInSanitizedEnv();
  assert.equal(result.shell, null);
  assert.equal(result.shell_available, false);
  assert.equal(result.bash_in_path, false);
  assert.equal(result.pwsh_in_path, false);
  assert.equal(result.node_version, null);
  assert.equal(result.bun_version, null);
  assert.equal(result.python_version, null);
  assert.equal(result.encoding, "utf8");
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(result)));
});

test("subprocess timeout returns null for version fields without crashing", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-test-module-mocks",
      "--experimental-strip-types",
      timeoutHarnessPath,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const versions = JSON.parse(result.stdout);
  assert.equal(versions.node_version, null);
  assert.equal(versions.bun_version, null);
  assert.equal(versions.python_version, null);
});

test("one failed runtime probe does not block other runtime probes", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-test-module-mocks",
      "--experimental-strip-types",
      isolationHarnessPath,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.ok(parsed.node_version !== null, "node probe should still succeed");
  assert.equal(parsed.python_version, null, "python probe should fail gracefully");
  assert.ok(parsed.risks.includes("python_not_available"));
});

test("probe never throws when subprocess and filesystem probes all fail", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-test-module-mocks",
      "--experimental-strip-types",
      neverThrowsHarnessPath,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.threw, false);
});

test("encoding prefers LC_CTYPE over LANG", () => {
  withEnv({ LC_CTYPE: "en_US.UTF-8", LANG: "C" }, () => {
    assert.equal(probe().encoding, "en_US.UTF-8");
  });
});

test("encoding falls back to LANG when LC_CTYPE is unset", () => {
  withEnv({ LC_CTYPE: undefined, LANG: "ja_JP.UTF-8" }, () => {
    assert.equal(probe().encoding, "ja_JP.UTF-8");
  });
});

test("encoding falls back to utf8 when LC_CTYPE and LANG are unset", () => {
  withEnv({ LC_CTYPE: undefined, LANG: undefined }, () => {
    assert.equal(probe().encoding, "utf8");
  });
});

test("empty environment includes all applicable risk strings", () => {
  const result = runProbeInSanitizedEnv();
  assert.ok(Array.isArray(result.risks));
  assert.ok(result.risks.includes("bash_not_in_path"));
  assert.ok(result.risks.includes("pwsh_not_in_path"));
  assert.ok(result.risks.includes("node_not_available"));
  assert.ok(result.risks.includes("bun_not_available"));
  assert.ok(result.risks.includes("python_not_available"));
});

test("non-ASCII path detection in non-ASCII CWD", () => {
  withTempCwd((dir) => {
    writeFileSync(join(dir, "テスト.txt"), "hello");
    const result = probe();
    assert.equal(result.has_non_ascii_paths_in_cwd, true);
    assert.ok(result.risks.includes("non_ascii_paths_in_cwd"));
  });
});

test("probe works when CWD is readable but empty", () => {
  withTempCwd(() => {
    const result = probe();
    assert.equal(result.has_non_ascii_paths_in_cwd, false);
    assert.ok(Array.isArray(result.risks));
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(result)));
  });
});

test("risks is always an array", () => {
  const scenarios = [
    () => probe(),
    () => runProbeInSanitizedEnv(),
  ];
  for (const run of scenarios) {
    const result = run();
    assert.ok(Array.isArray(result.risks), "risks must be an array");
    for (const risk of result.risks) {
      assert.equal(typeof risk, "string");
    }
  }
});

test("CLI output is always valid JSON", () => {
  const result = spawnSync(process.execPath, [cliPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.ok(Array.isArray(parsed.risks));
  assert.ok("encoding" in parsed);
});
