import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import {
  behaviorAssertions,
  EXTENSION_LOAD_ERROR_PATTERN,
  parseJsonLines,
  SDK_VERSIONS,
  UNHANDLED_ERROR_PATTERN,
  VERIFICATION_CONTRACT,
} from "./pi-sdk-smoke-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const reportPath = resolve(root, "docs/verification/pi-sdk-smoke.json");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const manifest = readJson(resolve(root, "package.json"));
const installedVersions = Object.fromEntries(Object.keys(SDK_VERSIONS).map((name) =>
  [name, readJson(resolve(root, "node_modules", name, "package.json")).version]));

for (const [name, version] of Object.entries(SDK_VERSIONS)) {
  if (manifest.devDependencies?.[name] !== version || installedVersions[name] !== version) {
    throw new Error(`Smoke requires exact dev/test pin and installed version ${version} for ${name}; manifest=${manifest.devDependencies?.[name]}, installed=${installedVersions[name]}`);
  }
}

const piManifest = readJson(resolve(root, "node_modules/@earendil-works/pi-coding-agent/package.json"));
const piCli = resolve(root, "node_modules/@earendil-works/pi-coding-agent", piManifest.bin.pi);
const agentDir = mkdtempSync(resolve(tmpdir(), "pi-env-probe-smoke-"));
const env = { ...process.env, PI_CODING_AGENT_DIR: agentDir, PI_OFFLINE: "1", PI_TELEMETRY: "0" };
const rpcArgs = [piCli, "--offline", "--no-session", "--no-tools", "--no-extensions", "--no-skills",
  "--no-context-files", "--no-prompt-templates", "--no-mcp", "-e", ".", "--mode", "rpc"];
const commandRequest = `${JSON.stringify({ type: "get_commands", id: "command-registration" })}\n`;
const featureRequests = `${commandRequest}${JSON.stringify({ type: "prompt", id: "feature-response", message: "/env-probe" })}\n`;

function runProcess(name, executable, args, input) {
  const result = spawnSync(executable, args, {
    cwd: root,
    env,
    input,
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const escaped = (value) => JSON.stringify(value).slice(1, -1);
  const sanitize = (value) => value
    .replaceAll(root, "<repo>")
    .replaceAll(escaped(root), "<repo>")
    .replaceAll(agentDir, "<isolated-pi-agent-dir>")
    .replaceAll(escaped(agentDir), "<isolated-pi-agent-dir>");
  const safeStdout = sanitize(stdout);
  const safeStderr = sanitize(stderr);
  const fullOutput = `${safeStdout}${safeStderr ? `${safeStdout ? "\n" : ""}${safeStderr}` : ""}${result.error ? `\n${result.error.message}` : ""}`;
  const responses = [...parseJsonLines(safeStdout), ...parseJsonLines(safeStderr)];
  const exit_code = Number.isInteger(result.status) ? result.status : 1;
  const process_exited = result.error === undefined && result.signal === null && Number.isInteger(result.status);
  const assertions = behaviorAssertions(name, {
    responses,
    fullOutput,
    exit_code,
    process_exited,
    expectedVersion: installedVersions["@earendil-works/pi-coding-agent"],
    platform: process.platform,
  });
  const hasUnhandledError = UNHANDLED_ERROR_PATTERN.test(fullOutput);
  const hasLoadError = EXTENSION_LOAD_ERROR_PATTERN.test(fullOutput);
  return {
    name,
    command: "npm run smoke:pi",
    exit_code,
    passed: process_exited && exit_code === 0 && !hasUnhandledError && !hasLoadError && assertions.every((item) => item.passed),
    evidence: fullOutput.slice(-6000) || "No output captured",
    assertions,
    hasUnhandledError,
    hasLoadError,
  };
}

function nativeShellArgs() {
  if (process.platform === "win32") {
    const shell = resolve(process.env.SystemRoot ?? "C:/Windows", "System32/WindowsPowerShell/v1.0/powershell.exe");
    const quote = (value) => `'${value.replaceAll("'", "''")}'`;
    return [shell, ["-NoProfile", "-NonInteractive", "-Command",
      `& ${quote(process.execPath)} ${quote(piCli)} --no-extensions --version; exit $LASTEXITCODE`], ""];
  }
  return ["/bin/sh", ["-c", '"$1" "$2" --no-extensions --version', "pi-env-probe-smoke", process.execPath, piCli], ""];
}

try {
  const cases = [
    runProcess("extension_load", process.execPath, rpcArgs, commandRequest),
    runProcess("happy_path", process.execPath, rpcArgs, featureRequests),
    runProcess("error_path", process.execPath, rpcArgs, "not-json\n"),
    runProcess("reload_cleanup", process.execPath, rpcArgs, featureRequests),
  ];
  const [shell, args, input] = nativeShellArgs();
  cases.push(runProcess("host_shell", shell, args, input));

  const report = {
    schema_version: 1,
    verification_contract: VERIFICATION_CONTRACT,
    sdk_versions: installedVersions,
    platform: process.platform,
    model_inference: `none; actual Pi ${installedVersions["@earendil-works/pi-coding-agent"]} host loads the extension and handles /env-probe RPC input`,
    unhandled_errors: cases.filter((item) => item.hasUnhandledError).length,
    extension_load_errors: cases.filter((item) => item.hasLoadError || (item.name === "extension_load" && !item.passed)).length,
    cases: cases.map(({ hasUnhandledError, hasLoadError, ...item }) => item),
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ verification_contract: VERIFICATION_CONTRACT, platform: process.platform,
    cases: cases.map(({ name, passed, exit_code }) => ({ name, passed, exit_code })) }));
  if (cases.some((item) => !item.passed)) process.exitCode = 1;
} finally {
  rmSync(agentDir, { recursive: true, force: true });
}
