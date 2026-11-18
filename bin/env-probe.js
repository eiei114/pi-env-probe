#!/usr/bin/env node

/**
 * pi env-probe CLI entry point
 *
 * Calls probe() once and prints formatted output to stdout.
 */

import { probe } from "../lib/probe.ts";
import { formatJson, formatText, parseFormatArgs } from "../lib/format.ts";

const parsed = parseFormatArgs(process.argv.slice(2));
if (!parsed.ok) {
  process.stderr.write(parsed.error);
  process.exit(1);
}

const result = probe();
if (parsed.format === "text") {
  process.stdout.write(formatText(result));
} else {
  process.stdout.write(formatJson(result));
}
