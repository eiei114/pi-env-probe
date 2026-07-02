# pi-env-probe

[![CI](https://github.com/eiei114/pi-env-probe/actions/workflows/ci.yml/badge.svg)](https://github.com/eiei114/pi-env-probe/actions/workflows/ci.yml)
[![Publish](https://github.com/eiei114/pi-env-probe/actions/workflows/publish.yml/badge.svg)](https://github.com/eiei114/pi-env-probe/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/pi-env-probe.svg)](https://www.npmjs.com/package/pi-env-probe)
[![npm downloads](https://img.shields.io/npm/dm/pi-env-probe.svg)](https://www.npmjs.com/package/pi-env-probe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Pi package](https://img.shields.io/badge/pi-package-purple.svg)](https://pi.dev/packages)

> Cross-platform environment diagnostics for Pi — shell, PATH, runtime, encoding, and non-ASCII path risks in compact JSON.

## What this is

`pi-env-probe` collects lightweight environment diagnostics and returns them as compact JSON. Use it from the CLI, as a Pi slash command, or import `probe()` in your own tooling.

## Features

- Detects the current shell (`bash`, `pwsh`, `cmd`, `zsh`, or `null`)
- Reports whether common shells are available in `PATH`
- Returns the platform path separator (`;` on Windows, `:` on POSIX)
- Never throws from `probe()` — subprocess failures degrade to `false` / `null`

## Install

Install the published npm package with Pi:

```bash
pi install npm:pi-env-probe
```

Install into the current project instead of your user Pi settings:

```bash
pi install npm:pi-env-probe -l
```

Or install from GitHub:

```bash
pi install git:github.com/eiei114/pi-env-probe
```

Try it without permanently installing:

```bash
pi -e npm:pi-env-probe
```

## Quick start

Try this package locally:

```bash
pi -e .
```

Then run:

```txt
/env-probe
```

Or use the standalone CLI:

```bash
node bin/env-probe.js
```

## Package contents

| Path | Purpose |
|---|---|
| `lib/` | Shared probe logic (`probe.ts`) |
| `extensions/` | Pi extension registering `/env-probe` |
| `bin/` | Standalone CLI entry point |

## Development

```bash
npm install
npm run ci
```

## Verification

```bash
npm install
npm run typecheck
npm test
node bin/env-probe.js
node bin/env-probe.js | node -e "process.stdin.on('data',d=>{JSON.parse(d);console.log('valid JSON')})"
npm pack --dry-run
```

## Release

This package is set up for npm Trusted Publishing, so no `NPM_TOKEN` is required.

```bash
npm version patch
git push
```

## License

MIT — see [LICENSE](LICENSE).
