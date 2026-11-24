import assert from "node:assert/strict";
import test from "node:test";
import { detectComSpecShell } from "../lib/probe.ts";

for (const [comSpec, expected] of [
  [String.raw`C:\Tools\PowerShell\CMD.EXE`, "cmd"],
  [String.raw`C:\Tools\cmd\PowerShell.EXE`, "pwsh"],
  [String.raw`C:\Program Files\PowerShell\7\PWSH.EXE`, "pwsh"],
  [String.raw`C:\Tools\cmd\PowerShell\runner.exe`, null],
  [String.raw`C:\Tools\pwsh-wrapper.exe`, null],
]) {
  test(`ComSpec=${comSpec} classifies as ${expected}`, () => {
    assert.equal(detectComSpecShell(comSpec), expected);
  });
}
