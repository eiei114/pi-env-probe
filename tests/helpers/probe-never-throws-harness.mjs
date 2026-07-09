/**
 * Subprocess harness: force every execSync call to throw.
 * Run with: node --experimental-test-module-mocks --experimental-strip-types <this-file>
 */
import { mock } from "node:test";

mock.module("node:child_process", {
  exports: {
    /** Always throw to simulate total subprocess probe failure. */
    execSync() {
      throw new Error("forced subprocess failure");
    },
  },
});

mock.module("node:fs", {
  exports: {
    /** Always throw to simulate filesystem probe failure. */
    readdirSync() {
      throw new Error("forced readdir failure");
    },
  },
});

const { probe } = await import("../../lib/probe.ts");
let threw = false;
try {
  probe();
} catch {
  threw = true;
}
process.stdout.write(JSON.stringify({ threw }));
