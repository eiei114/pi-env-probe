const realUrl = new URL("../../lib/probe.ts?__real_probe__=1", import.meta.url);
const { probe: realProbe } = await import(realUrl.href);

export function probe(...args) {
  globalThis.__piEnvProbeCalls = (globalThis.__piEnvProbeCalls ?? 0) + 1;
  return realProbe(...args);
}
