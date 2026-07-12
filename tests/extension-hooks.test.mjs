import assert from "node:assert/strict";
import test from "node:test";

const registerExtension = (await import("../extensions/index.ts")).default;

function createMockAPI() {
  /** @type {Map<string, Array<(event: unknown, ctx: unknown) => unknown>>} */
  const handlers = new Map();
  /** @type {Array<{ name: string, handler: Function }>} */
  const commands = [];

  const api = {
    on(event, handler) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    registerCommand(name, spec) {
      commands.push({ name, ...spec });
    },
  };

  async function emit(eventName, event, ctx) {
    for (const handler of handlers.get(eventName) ?? []) {
      await handler(event, ctx);
    }
  }

  return { api, handlers, emit, commands };
}

function createMockUI() {
  /** @type {Array<{ message: string, type?: string }>} */
  const notifications = [];

  const ui = {
    notify(message, type) {
      notifications.push({ message, type });
    },
  };

  return { ui, notifications };
}

function createMockContext({ ui, hasUI = true }) {
  return { ui, hasUI };
}

test("env-probe command skips UI notify when hasUI is false", async () => {
  const { api, commands } = createMockAPI();
  registerExtension(api);

  const { ui, notifications } = createMockUI();
  const ctx = createMockContext({ ui, hasUI: false });

  const command = commands.find((c) => c.name === "env-probe");
  assert.ok(command);

  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(" "));

  try {
    await command.handler("", ctx);
  } finally {
    console.log = originalLog;
  }

  assert.equal(notifications.length, 0);
  assert.match(logs[0] ?? "", /"shell"/);
});

test("env-probe command notifies when hasUI is true", async () => {
  const { api, commands } = createMockAPI();
  registerExtension(api);

  const { ui, notifications } = createMockUI();
  const ctx = createMockContext({ ui, hasUI: true });

  const command = commands.find((c) => c.name === "env-probe");
  assert.ok(command);

  const originalLog = console.log;
  console.log = () => {};

  try {
    await command.handler("", ctx);
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(notifications, [
    { message: "env-probe results collected", type: "info" },
  ]);
});

test("session_shutdown handler is registered", async () => {
  const { api, handlers, emit } = createMockAPI();
  registerExtension(api);

  assert.ok(handlers.has("session_shutdown"));
  await assert.doesNotReject(async () => {
    await emit("session_shutdown", { type: "session_shutdown" }, {});
  });
});
