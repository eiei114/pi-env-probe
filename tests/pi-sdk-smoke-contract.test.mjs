import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  behaviorAssertions,
  parseJsonLines,
  parseJsonObjects,
  SDK_VERSIONS,
  VERIFICATION_CONTRACT,
} from "../scripts/pi-sdk-smoke-contract.mjs";

const diagnostics = {
  shell: "pwsh",
  shell_available: true,
  bash_in_path: true,
  pwsh_in_path: true,
  path_separator: ";",
  node_version: "v24.0.0",
  bun_version: null,
  python_version: "Python 3.13.0",
  encoding: "utf8",
  has_non_ascii_paths_in_cwd: false,
  risks: ["bun_not_available"],
};
const registration = {
  type: "response",
  id: "command-registration",
  command: "get_commands",
  success: true,
  data: { commands: [{ name: "env-probe", source: "extension" }] },
};
const prompt = {
  type: "response",
  id: "feature-response",
  command: "prompt",
  success: true,
  data: { disposition: "handled" },
};
const probeOutput = JSON.stringify(diagnostics, null, 2);
const featureOutput = `${JSON.stringify(registration)}\n${JSON.stringify(prompt)}\n${probeOutput}`;
const errorResponse = {
  type: "response",
  command: "parse",
  success: false,
  error: "Invalid JSON input",
};
const observe = (name, overrides = {}) => behaviorAssertions(name, {
  responses: [], fullOutput: "", exit_code: 0, process_exited: true, platform: "win32", ...overrides,
});

test("Pi SDK behavior contract and JSON parsing handle RPC JSONL and pretty feature JSON", () => {
  assert.equal(VERIFICATION_CONTRACT, "pi-sdk-behavior-v2");
  assert.deepEqual(SDK_VERSIONS, {
    "@earendil-works/pi-agent-core": "1.2.0",
    "@earendil-works/pi-ai": "1.2.0",
    "@earendil-works/pi-coding-agent": "1.2.0",
    "@earendil-works/pi-tui": "1.2.0",
  });
  assert.deepEqual(parseJsonLines(`not-json\r\n${JSON.stringify(prompt)}\n`), [prompt]);
  assert.deepEqual(parseJsonObjects(probeOutput), [diagnostics]);
});

test("committed smoke evidence satisfies the v2 report contract without local absolute paths", async () => {
  const report = JSON.parse(await readFile(new URL("../docs/verification/pi-sdk-smoke.json", import.meta.url), "utf8"));
  assert.equal(report.schema_version, 1);
  assert.equal(report.verification_contract, VERIFICATION_CONTRACT);
  assert.deepEqual(report.sdk_versions, SDK_VERSIONS);
  assert.equal(report.unhandled_errors, 0);
  assert.equal(report.extension_load_errors, 0);
  assert.deepEqual(report.cases.map((item) => item.name), [
    "extension_load", "happy_path", "error_path", "reload_cleanup", "host_shell",
  ]);
  const assertionIds = Object.fromEntries(report.cases.map((item) => [item.name, item.assertions.map((entry) => entry.id)]));
  assert.deepEqual(assertionIds, {
    extension_load: ["extension_registered"],
    happy_path: ["feature_response"],
    error_path: ["handled_error"],
    reload_cleanup: ["reloaded_extension_registered", "reloaded_feature_response", "clean_shutdown"],
    host_shell: ["native_shell_boundary"],
  });
  for (const item of report.cases) {
    assert.equal(item.exit_code, 0);
    assert.equal(item.passed, true);
    assert.ok(item.command.length > 0);
    assert.ok(item.evidence.length > 0);
    assert.ok(item.assertions.length > 0);
    for (const assertion of item.assertions) {
      assert.ok(assertion.id.length > 0);
      assert.ok(assertion.expected.length > 0);
      assert.ok(assertion.observed.length > 0);
      assert.equal(assertion.passed, true);
    }
  }
  assert.doesNotMatch(JSON.stringify(report), /[A-Z]:\\\\Users\\|\/home\//);
});

test("extension_load requires actual RPC command registration", () => {
  const [assertion] = observe("extension_load", { responses: [registration] });
  assert.equal(assertion.id, "extension_registered");
  assert.equal(assertion.passed, true);
  assert.equal(observe("extension_load", { responses: [] })[0].passed, false);
  assert.equal(observe("extension_load", { responses: [{ ...registration, data: { commands: [] } }] })[0].passed, false);
  assert.equal(observe("extension_load", { responses: [{ ...registration, data: { commands: [{ name: "env-probe", source: "prompt" }] } }] })[0].passed, false);
});

test("happy_path requires handled slash-command response and observed diagnostic fields", () => {
  const [assertion] = observe("happy_path", { responses: [registration, prompt], fullOutput: featureOutput });
  assert.equal(assertion.id, "feature_response");
  assert.equal(assertion.passed, true);
  assert.equal(observe("happy_path", { responses: [registration], fullOutput: probeOutput })[0].passed, false);
  assert.equal(observe("happy_path", { responses: [registration, { ...prompt, success: false }], fullOutput: probeOutput })[0].passed, false);
  assert.equal(observe("happy_path", { responses: [registration, prompt], fullOutput: "{}" })[0].passed, false);
  assert.equal(observe("happy_path", { responses: [registration, prompt], fullOutput: probeOutput.replace('"path_separator": ";"', '"path_separator": ":"') })[0].passed, false);
});

test("error_path requires an actual handled malformed-RPC response", () => {
  const [assertion] = observe("error_path", { responses: [errorResponse] });
  assert.equal(assertion.id, "handled_error");
  assert.equal(assertion.passed, true);
  assert.equal(observe("error_path", { responses: [] })[0].passed, false);
  assert.equal(observe("error_path", { responses: [{ ...errorResponse, success: true }] })[0].passed, false);
  assert.equal(observe("error_path", { responses: [{ ...errorResponse, error: "" }] })[0].passed, false);
});

test("reload_cleanup requires second-process registration, feature response, and clean exit", () => {
  const actual = observe("reload_cleanup", { responses: [registration, prompt], fullOutput: featureOutput });
  assert.deepEqual(actual.map((item) => item.id), [
    "reloaded_extension_registered", "reloaded_feature_response", "clean_shutdown",
  ]);
  assert.ok(actual.every((item) => item.passed));

  const exitOnly = observe("reload_cleanup", { responses: [], fullOutput: "", exit_code: 0, process_exited: true });
  assert.equal(exitOnly[0].passed, false);
  assert.equal(exitOnly[1].passed, false);
  assert.equal(exitOnly[2].passed, true);
  assert.equal(observe("reload_cleanup", { responses: [registration], fullOutput: featureOutput })[1].passed, false);
  assert.equal(observe("reload_cleanup", { responses: [registration, prompt], fullOutput: "UnhandledPromiseRejection" })[2].passed, false);
  assert.equal(observe("reload_cleanup", { responses: [registration, prompt], fullOutput: featureOutput, exit_code: 1 })[2].passed, false);
  assert.equal(observe("reload_cleanup", { responses: [registration, prompt], fullOutput: featureOutput, process_exited: false })[2].passed, false);
});

test("host_shell requires an exact pinned version and actual native process exit", () => {
  const version = SDK_VERSIONS["@earendil-works/pi-coding-agent"];
  assert.equal(observe("host_shell", { fullOutput: `${version}\n` })[0].passed, true);
  for (const output of ["", "11.1.0", `${version} but error`, "1.0.0"]) {
    assert.equal(observe("host_shell", { fullOutput: output })[0].passed, false);
  }
  assert.equal(observe("host_shell", { fullOutput: version, exit_code: 1 })[0].passed, false);
  assert.equal(observe("host_shell", { fullOutput: version, process_exited: false })[0].passed, false);
});
