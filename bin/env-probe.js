#!/usr/bin/env node

/**
 * pi env-probe CLI entry point
 *
 * Calls probe() and prints formatted JSON to stdout.
 */

import { probe } from "../lib/probe.ts";

const result = probe();
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
