/**
 * Subprocess harness: mock execSync to fail only for python version probes.
 * Run with: node --experimental-test-module-mocks --experimental-strip-types <this-file>
 */
import { mock } from "node:test";
import { execSync as realExecSync } from "node:child_process";

mock.module("node:child_process", {
  exports: {
    /** Fail only python version probes; delegate all other commands to real execSync. */
    execSync(command, options) {
      const cmd = String(command);
      if (cmd.includes("python")) {
        throw new Error("python probe failed");
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
    python_version: result.python_version,
    risks: result.risks,
  }),
);
