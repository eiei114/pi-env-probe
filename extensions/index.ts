/**
 * pi-env-probe Pi extension
 *
 * Registers the `/env-probe` slash command so Pi users can run
 * environment diagnostics from the chat.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { probe } from "../lib/probe.ts";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("env-probe", {
    description: "Run environment diagnostics (shell, PATH, encoding, non-ASCII path risks)",
    handler: async (_args, ctx) => {
      const result = probe();
      const formatted = JSON.stringify(result, null, 2);
      ctx.ui.notify("env-probe results collected", "info");
      console.log(formatted);
    },
  });
}
