import type { ProbeResult } from "./probe.ts";

const KNOWN_RISKS = new Set([
  "bash_not_in_path",
  "pwsh_not_in_path",
  "node_not_available",
  "bun_not_available",
  "python_not_available",
  "non_ascii_paths_in_cwd",
]);

const SHELL_RISKS = ["bash_not_in_path", "pwsh_not_in_path"] as const;
const RUNTIME_RISKS = ["node_not_available", "bun_not_available", "python_not_available"] as const;
const PATH_RISKS = ["non_ascii_paths_in_cwd"] as const;
const UNKNOWN_PLACEHOLDER = "[unknown_risk]";
const MAX_VALUE = 128;
const MAX_OUTPUT = 4096;
const PATH_LIKE_RE = /(^[A-Za-z]:[\\/]|[\\/])/;

function containsControlChars(value: string): boolean {
  return /[\u0000-\u001F\u007F\u0080-\u009F]/.test(value);
}

function sanitizeValue(value: string): string {
  // Normalize C0/C1 control chars (including newlines/tabs, DEL, NEL, etc.) and cap length.
  const normalized = value.replace(/[\u0000-\u001F\u007F\u0080-\u009F]/g, " ");
  if (normalized.length <= MAX_VALUE) return normalized;
  return normalized.slice(0, MAX_VALUE);
}

function displayVersion(value: string | null): string {
  if (value === null) return "not available";
  // Do not disclose path-like or raw subprocess content; redact if it looks like a path.
  if (PATH_LIKE_RE.test(value)) return "[redacted]";
  return sanitizeValue(value);
}

function shellState(result: ProbeResult): string {
  const name = result.shell === null ? "not detected" : result.shell;
  const available = result.shell_available ? "available" : "not available";
  return `Shell: ${name} (${available})`;
}

function runtimeLines(result: ProbeResult): string[] {
  return [
    `Node.js: ${displayVersion(result.node_version)}`,
    `Bun: ${displayVersion(result.bun_version)}`,
    `Python: ${displayVersion(result.python_version)}`,
  ];
}

function knownRiskLine(code: string): string {
  switch (code) {
    case "bash_not_in_path":
      return "Finding: bash_not_in_path - bash was not found in PATH. If you need bash for your workflow, check that it is installed and on PATH.";
    case "pwsh_not_in_path":
      return "Finding: pwsh_not_in_path - pwsh was not found in PATH. If you need PowerShell 7 for your workflow, check that it is installed and on PATH.";
    case "node_not_available":
      return "Finding: node_not_available - Node.js was not detected. If you need Node.js for your workflow, check that it is installed and on PATH.";
    case "bun_not_available":
      return "Finding: bun_not_available - Bun was not detected. If you need Bun for your workflow, check that it is installed and on PATH.";
    case "python_not_available":
      return "Finding: python_not_available - Python was not detected. If you need Python for your workflow, check that it is installed and on PATH.";
    case "non_ascii_paths_in_cwd":
      return "Finding: non_ascii_paths_in_cwd - One or more direct children of the current working directory have non-ASCII names. This check covers non-ASCII names directly under the current working directory only.";
    default:
      return "";
  }
}

function unknownRiskId(code: string): string {
  return /^[a-z0-9_]{1,64}$/.test(code) ? code : UNKNOWN_PLACEHOLDER;
}

function orderedFindings(risks: string[]): string[] {
  const present = new Set(risks);
  const lines: string[] = [];
  for (const code of SHELL_RISKS) {
    if (present.has(code)) lines.push(knownRiskLine(code));
  }
  for (const code of RUNTIME_RISKS) {
    if (present.has(code)) lines.push(knownRiskLine(code));
  }
  for (const code of PATH_RISKS) {
    if (present.has(code)) lines.push(knownRiskLine(code));
  }
  for (const code of risks) {
    if (!KNOWN_RISKS.has(code)) {
      lines.push(`Finding: ${unknownRiskId(code)} - Unknown finding reported by the probe. No guidance is available.`);
    }
  }
  return lines;
}

export function formatText(result: ProbeResult): string {
  const lines: string[] = [];
  lines.push(shellState(result));
  lines.push(...runtimeLines(result));

  const knownPresent = result.risks.some((r) => KNOWN_RISKS.has(r));
  const unknownPresent = result.risks.some((r) => !KNOWN_RISKS.has(r));
  if (!knownPresent && !unknownPresent) {
    lines.push(
      "No risks were found in the checks performed (shell availability, Node.js/Bun/Python availability, and non-ASCII names directly under the current working directory). This does not mean the entire environment is safe.",
    );
  } else {
    lines.push(...orderedFindings(result.risks));
  }

  let output = lines.join("\n") + "\n";
  if (output.length > MAX_OUTPUT) {
    output = output.slice(0, MAX_OUTPUT);
  }
  return output;
}

export function formatJson(result: ProbeResult): string {
  return JSON.stringify(result, null, 2) + "\n";
}

export type ParsedFormat =
  | { ok: true; format: "json" | "text" }
  | { ok: false; error: string };

export function parseFormatArgs(argv: string[]): ParsedFormat {
  let format: "json" | "text" | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--format") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("-")) {
        return { ok: false, error: "Usage: env-probe [--format json|text]\n" };
      }
      if (value !== "json" && value !== "text") {
        return { ok: false, error: "Usage: env-probe [--format json|text]\n" };
      }
      format = value;
      i++;
      continue;
    }
    if (arg.startsWith("--format=")) {
      const value = arg.slice("--format=".length);
      if (value === "") {
        return { ok: false, error: "Usage: env-probe [--format json|text]\n" };
      }
      if (value !== "json" && value !== "text") {
        return { ok: false, error: "Usage: env-probe [--format json|text]\n" };
      }
      format = value;
      continue;
    }
  }
  return { ok: true, format: format ?? "json" };
}
