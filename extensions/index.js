/**
 * pi-env-probe Pi extension
 *
 * Registers the `/env-probe` slash command so Pi users can run
 * environment diagnostics from the chat.
 */

import { probe } from "../src/probe.js";
import { defineCommand } from "@earendil-works/pi-coding-agent";

export default function (pi) {
  pi.registerCommand("env-probe", {
    description: "Run environment diagnostics (shell, PATH, encoding, non-ASCII path risks)",
    handler: async (_args, ctx) => {
      const result = probe();
      const formatted = JSON.stringify(result, null, 2);
      ctx.ui.notify("env-probe results collected", "info");
      return {
        content: [{ type: "text", text: "```json\n" + formatted + "\n```" }],
        details: result,
      };
    },
  });
}
