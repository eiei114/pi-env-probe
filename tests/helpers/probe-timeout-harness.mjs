/**
 * Subprocess harness: mock execSync to throw ETIMEDOUT for version probes.
 * Run with: node --experimental-test-module-mocks --experimental-strip-types <this-file>
 */
import { mock } from "node:test";
import { execSync as realExecSync } from "node:child_process";

mock.module("node:child_process", {
  exports: {
    /** Throw ETIMEDOUT for version probes; delegate other commands to real execSync. */
    execSync(command, options) {
      const cmd = String(command);
      if (cmd.includes("--version")) {
        const err = new Error("Command timed out");
        err.code = "ETIMEDOUT";
        throw err;
      }
      return realExecSync(command, options);
    },
  },
});

const { probe } = await import("../../lib/probe.ts");
const result = probe();
process.stdout.write(
  JSON.stringify({
    node_version: result.node_version,
    bun_version: result.bun_version,
    python_version: result.python_version,
  }),
);
