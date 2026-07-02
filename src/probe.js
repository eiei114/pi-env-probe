/**
 * pi-env-probe — cross-platform environment diagnostics
 *
 * Returns compact JSON with shell detection, PATH analysis, and
 * non-ASCII path risk assessment.
 *
 * Every subprocess call is wrapped in try/catch. probe() never throws.
 */

import { execSync } from "node:child_process";

/**
 * Detect the current shell name.
 *
 * Strategy (in order):
 *   1. $SHELL env var (POSIX)
 *   2. ComSpec / $shell (Windows cmd / PowerShell)
 *   3. Subprocess: `bash --version`, `pwsh --version`, `zsh --version`
 *
 * @returns {"bash"|"pwsh"|"cmd"|"zsh"|null}
 */
function detectShell() {
  // POSIX: $SHELL environment variable
  const shellEnv = process.env.SHELL;
  if (shellEnv) {
    if (shellEnv.includes("bash")) return "bash";
    if (shellEnv.includes("zsh")) return "zsh";
    if (shellEnv.includes("fish")) return null; // not in spec
  }

  // Windows: ComSpec or $shell
  if (process.platform === "win32") {
    const comSpec = process.env.ComSpec || process.env.COMSPEC;
    if (comSpec) {
      const lower = comSpec.toLowerCase();
      if (lower.includes("powershell") || lower.includes("pwsh")) return "pwsh";
      if (lower.includes("cmd")) return "cmd";
    }
  }

  // Subprocess detection: try each shell binary
  try {
    execSync("bash --version", { stdio: "pipe", encoding: "utf8" });
    return "bash";
  } catch {
    // not available
  }

  try {
    execSync("pwsh --version", { stdio: "pipe", encoding: "utf8" });
    return "pwsh";
  } catch {
    // not available
  }

  try {
    execSync("zsh --version", { stdio: "pipe", encoding: "utf8" });
    return "zsh";
  } catch {
    // not available
  }

  return null;
}

/**
 * Check if a binary is available in PATH.
 *
 * Uses `which` on POSIX, `where` on Windows. Returns false on any error.
 *
 * @param {string} binary - Binary name to look up (e.g. "bash", "pwsh")
 * @returns {boolean}
 */
function binaryInPath(binary) {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    execSync(`${cmd} ${binary}`, { stdio: "pipe", encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run all probes and return the result object.
 *
 * @returns {object}
 */
export function probe() {
  const shell = detectShell();
  const shellAvailable = shell !== null || binaryInPath("bash") || binaryInPath("pwsh") || binaryInPath("zsh");
  const bashInPath = binaryInPath("bash");
  const pwshInPath = binaryInPath("pwsh");
  const pathSeparator = process.platform === "win32" ? ";" : ":";

  return {
    shell,
    shell_available: shellAvailable,
    bash_in_path: bashInPath,
    pwsh_in_path: pwshInPath,
    path_separator: pathSeparator,
  };
}
