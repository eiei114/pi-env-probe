import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const ciWorkflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const autoReleaseWorkflow = await readFile(new URL("../.github/workflows/auto-release.yml", import.meta.url), "utf8");
const publishWorkflow = await readFile(new URL("../.github/workflows/publish.yml", import.meta.url), "utf8");
const registerExtension = (await import("../extensions/index.ts")).default;

test("package declares pi extension", () => {
  assert.deepEqual(packageJson.pi.extensions, ["./extensions"]);
});

test("package declares env-probe command", () => {
  assert.equal(packageJson.pi.commands["env-probe"], "./bin/env-probe.js");
});

test("package is discoverable as a Pi package", () => {
  assert.ok(packageJson.keywords.includes("pi-package"));
});

test("package uses public publish config", () => {
  assert.equal(packageJson.publishConfig.access, "public");
});

test("ci workflow runs tests on push and pull_request", () => {
  assert.match(ciWorkflow, /on:\s*[\s\S]*push:/);
  assert.match(ciWorkflow, /pull_request:/);
  assert.match(ciWorkflow, /npm run ci/);
});

test("extension module loads and registers env-probe command", () => {
  assert.equal(typeof registerExtension, "function");

  const commands = [];
  registerExtension({
    on() {},
    registerCommand(name, spec) {
      commands.push({ name, ...spec });
    },
  });

  assert.equal(commands.length, 1);
  assert.equal(commands[0].name, "env-probe");
  assert.match(commands[0].description, /environment diagnostics/i);
  assert.equal(typeof commands[0].handler, "function");
});

test("template includes npm release workflow handoff", () => {
  assert.match(autoReleaseWorkflow, /actions:\s*write/);
  assert.match(autoReleaseWorkflow, /contents:\s*write/);
  assert.match(autoReleaseWorkflow, /gh workflow run publish\.yml/);
  assert.match(publishWorkflow, /id-token:\s*write/);
  assert.match(publishWorkflow, /workflow_dispatch:/);
  assert.match(publishWorkflow, /npm publish --access public/);
});
