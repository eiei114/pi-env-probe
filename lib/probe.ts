/**
 * pi-env-probe — cross-platform environment diagnostics
 *
 * Returns compact JSON with shell detection, PATH analysis, runtime
 * version probes, encoding detection, and non-ASCII path risk assessment.
 *
 * Every subprocess call is wrapped in try/catch. probe() never throws.
 */

import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";

export type ShellName = "bash" | "pwsh" | "cmd" | "zsh" | null;

export interface ProbeResult {
  shell: ShellName;
  shell_available: boolean;
  bash_in_path: boolean;
  pwsh_in_path: boolean;
  path_separator: ";" | ":";
  node_version: string | null;
  bun_version: string | null;
  python_version: string | null;
  encoding: string;
  has_non_ascii_paths_in_cwd: boolean;
  risks: string[];
}

const EXEC_OPTS = { stdio: "pipe", encoding: "utf8" } as const;

/**
 * Run a version probe command and return trimmed stdout, or null on failure.
 */
function probeVersion(command: string): string | null {
  try {
    const stdout = execSync(command, EXEC_OPTS);
    return stdout.trimEnd();
  } catch {
    return null;
  }
}

/**
 * Probe Python version — python3 first on POSIX, python on Windows.
 */
function probePythonVersion(): string | null {
  if (process.platform === "win32") {
    return probeVersion("python --version");
  }

  const python3 = probeVersion("python3 --version");
  if (python3 !== null) {
    return python3;
  }

  return probeVersion("python --version");
}

/**
 * Detect locale encoding from process environment.
 */
function detectEncoding(): string {
  return process.env.LC_CTYPE || process.env.LANG || "utf8";
}

/**
 * Detect the current shell name.
 */
function detectShell(): ShellName {
  const shellEnv = process.env.SHELL;
  if (shellEnv) {
    if (shellEnv.includes("bash")) return "bash";
    if (shellEnv.includes("zsh")) return "zsh";
    return null;
  }

  if (process.platform === "win32") {
    const comSpec = process.env.ComSpec || process.env.COMSPEC;
    if (comSpec) {
      const lower = comSpec.toLowerCase();
      if (lower.includes("powershell") || lower.includes("pwsh")) return "pwsh";
      if (lower.includes("cmd")) return "cmd";
    }
  }

  try {
    execSync("bash --version", EXEC_OPTS);
    return "bash";
  } catch {
    // not available
  }

  try {
    execSync("pwsh --version", EXEC_OPTS);
    return "pwsh";
  } catch {
    // not available
  }

  try {
    execSync("zsh --version", EXEC_OPTS);
    return "zsh";
  } catch {
    // not available
  }

  return null;
}

const NON_ASCII_RE = /[^\x00-\x7F]/;

/**
 * Check if any direct child of CWD has a non-ASCII name.
 */
function hasNonAsciiPathsInCwd(): boolean {
  try {
    const entries = readdirSync(process.cwd());
    return entries.some((entry) => NON_ASCII_RE.test(entry));
  } catch {
    return false;
  }
}

/**
 * Check if a binary is available in PATH.
 */
function binaryInPath(binary: string): boolean {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    execSync(`${cmd} ${binary}`, EXEC_OPTS);
    return true;
  } catch {
    return false;
  }
}

/**
 * Run all probes and return the result object.
 */
export function probe(): ProbeResult {
  const shell = detectShell();
  const bashInPath = binaryInPath("bash");
  const pwshInPath = binaryInPath("pwsh");
  const shellAvailable =
    shell !== null || bashInPath || pwshInPath || binaryInPath("zsh");
  const pathSeparator = process.platform === "win32" ? ";" : ":";

  const nodeVersion = probeVersion("node --version");
  const bunVersion = probeVersion("bun --version");
  const pythonVersion = probePythonVersion();
  const hasNonAsciiPaths = hasNonAsciiPathsInCwd();

  const risks: string[] = [];

  if (!bashInPath) {
    risks.push("bash_not_in_path");
  }
  if (!pwshInPath) {
    risks.push("pwsh_not_in_path");
  }

  if (nodeVersion === null) {
    risks.push("node_not_available");
  }
  if (bunVersion === null) {
    risks.push("bun_not_available");
  }
  if (pythonVersion === null) {
    risks.push("python_not_available");
  }

  if (hasNonAsciiPaths) {
    risks.push("non_ascii_paths_in_cwd");
  }

  return {
    shell,
    shell_available: shellAvailable,
    bash_in_path: bashInPath,
    pwsh_in_path: pwshInPath,
    path_separator: pathSeparator,
    node_version: nodeVersion,
    bun_version: bunVersion,
    python_version: pythonVersion,
    encoding: detectEncoding(),
    has_non_ascii_paths_in_cwd: hasNonAsciiPaths,
    risks,
  };
}
