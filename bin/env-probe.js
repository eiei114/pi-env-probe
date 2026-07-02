#!/usr/bin/env node

/**
 * pi env-probe CLI entry point
 *
 * Calls probe() and prints formatted JSON to stdout.
 */

import { probe } from "../src/probe.js";

const result = probe();
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
