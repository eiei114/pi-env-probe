import { mock } from "node:test";

// Exercise POSIX fallback regardless of the host OS or installed runtimes.
Object.defineProperty(process, "platform", { value: "linux" });

const pythonCommands = [];
mock.module("node:child_process", {
  exports: {
    execSync(command) {
      switch (command) {
        case "node --version":
          return "";
        case "bun --version":
          return "  1.3.0\r\n";
        case "python3 --version":
          pythonCommands.push(command);
          return " \t\r\n";
        case "python --version":
          pythonCommands.push(command);
          return "Python 3.12.0\n";
        default:
          throw new Error(`Command unavailable in probe fixture: ${command}`);
      }
    },
  },
});

const { probe } = await import("../../lib/probe.ts");
process.stdout.write(JSON.stringify({ result: probe(), pythonCommands }));
