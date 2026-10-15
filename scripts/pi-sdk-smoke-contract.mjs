export const VERIFICATION_CONTRACT = "pi-sdk-behavior-v2";
export const SDK_VERSIONS = {
  "@earendil-works/pi-agent-core": "1.2.0",
  "@earendil-works/pi-ai": "1.2.0",
  "@earendil-works/pi-coding-agent": "1.2.0",
  "@earendil-works/pi-tui": "1.2.0",
};
export const UNHANDLED_ERROR_PATTERN = /UnhandledPromiseRejection|uncaught exception|shutdown error|error during shutdown/i;
export const EXTENSION_LOAD_ERROR_PATTERN = /Failed to load extension|Error loading extension|Failed to load package|Extension .* (?:failed|could not load)/i;

export function parseJsonLines(output) {
  return output.split(/\r?\n/).flatMap((line) => {
    if (!line.trim()) return [];
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

// Extension console output is pretty-printed JSON rather than RPC JSONL.
export function parseJsonObjects(output) {
  const objects = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < output.length; index++) {
    const character = output[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      if (depth === 0) start = index;
      depth++;
    } else if (character === "}" && depth > 0) {
      depth--;
      if (depth === 0) {
        try {
          objects.push(JSON.parse(output.slice(start, index + 1)));
        } catch {
          // Ignore braces from surrounding non-JSON log lines.
        }
        start = -1;
      }
    }
  }
  return objects;
}

function assertion(id, expected, observed, passed) {
  return { id, expected, observed: JSON.stringify(observed), passed: passed === true };
}

function responseFor(responses, id, command) {
  return responses.find((row) => row?.type === "response" && row.id === id && row.command === command);
}

function registeredCommand(responses) {
  const listing = responseFor(responses, "command-registration", "get_commands");
  const command = listing?.success === true && Array.isArray(listing.data?.commands)
    ? listing.data.commands.find((item) => item?.name === "env-probe" && item.source === "extension")
    : undefined;
  return { listing: listing ?? null, command: command ?? null };
}

function probeResultFrom(fullOutput, platform) {
  const expectedSeparator = platform === "win32" ? ";" : ":";
  return parseJsonObjects(fullOutput).find((value) =>
    typeof value?.shell_available === "boolean" &&
    typeof value?.bash_in_path === "boolean" &&
    typeof value?.pwsh_in_path === "boolean" &&
    value?.path_separator === expectedSeparator &&
    Object.hasOwn(value, "shell") &&
    Object.hasOwn(value, "node_version") &&
    Object.hasOwn(value, "bun_version") &&
    Object.hasOwn(value, "python_version") &&
    typeof value?.encoding === "string" && value.encoding.length > 0 &&
    typeof value?.has_non_ascii_paths_in_cwd === "boolean" &&
    Array.isArray(value?.risks) && value.risks.every((risk) => typeof risk === "string"));
}

function featureObservation(responses, fullOutput, platform) {
  const prompt = responseFor(responses, "feature-response", "prompt");
  const result = probeResultFrom(fullOutput, platform);
  return {
    prompt: prompt ?? null,
    probe_result: result ?? null,
    passed: prompt?.success === true && prompt.data?.disposition === "handled" && result !== undefined,
  };
}

export function behaviorAssertions(name, {
  responses = [],
  fullOutput = "",
  exit_code = 1,
  process_exited = false,
  expectedVersion = SDK_VERSIONS["@earendil-works/pi-coding-agent"],
  platform = process.platform,
}) {
  const registration = registeredCommand(responses);
  const feature = featureObservation(responses, fullOutput, platform);

  if (name === "extension_load") {
    return [assertion("extension_registered", "The actual Pi host lists /env-probe as an extension command",
      registration, registration.command !== null)];
  }
  if (name === "happy_path") {
    return [assertion("feature_response", "The actual Pi host handles /env-probe and emits a complete diagnostics JSON object",
      feature, feature.passed)];
  }
  if (name === "error_path") {
    const parseError = responses.find((row) => row?.type === "response" && row.command === "parse");
    return [assertion("handled_error", "Malformed RPC input returns a structured parse failure without an unhandled process error",
      parseError ?? null, parseError?.success === false && typeof parseError.error === "string" && parseError.error.length > 0)];
  }
  if (name === "reload_cleanup") {
    return [
      assertion("reloaded_extension_registered", "A second actual Pi process registers /env-probe",
        registration, registration.command !== null),
      assertion("reloaded_feature_response", "The second Pi process handles /env-probe and emits complete diagnostics JSON",
        feature, feature.passed),
      assertion("clean_shutdown", "The second Pi process exits zero without unhandled or shutdown errors",
        { exit_code, process_exited, errors: UNHANDLED_ERROR_PATTERN.test(fullOutput) },
        process_exited && exit_code === 0 && !UNHANDLED_ERROR_PATTERN.test(fullOutput)),
    ];
  }
  if (name === "host_shell") {
    return [assertion("native_shell_boundary", "The native host shell launches the locally pinned Pi CLI and returns its exact version",
      { exit_code, process_exited, output: fullOutput.trim(), expectedVersion },
      process_exited && exit_code === 0 && fullOutput.trim() === expectedVersion)];
  }
  throw new Error(`Unknown smoke case: ${name}`);
}
