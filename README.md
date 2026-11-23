# pi-env-probe

[![Join dotfield.xyz on Discord](https://img.shields.io/badge/Join%20dotfield.xyz%20on%20Discord-5865F2?logo=discord&logoColor=white)](https://discord.gg/4945dXZVW5)

[![CI](https://github.com/eiei114/pi-env-probe/actions/workflows/ci.yml/badge.svg)](https://github.com/eiei114/pi-env-probe/actions/workflows/ci.yml)
[![Publish](https://github.com/eiei114/pi-env-probe/actions/workflows/publish.yml/badge.svg)](https://github.com/eiei114/pi-env-probe/actions/workflows/publish.yml)
[![npm version](https://img.shields.io/npm/v/pi-env-probe.svg)](https://www.npmjs.com/package/pi-env-probe)
[![npm downloads](https://img.shields.io/npm/dm/pi-env-probe.svg)](https://www.npmjs.com/package/pi-env-probe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Pi package](https://img.shields.io/badge/pi-package-purple.svg)](https://pi.dev/packages)

<a href="https://buymeacoffee.com/ekawano114m"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" height="60"></a>

> Cross-platform environment diagnostics for Pi — shell, PATH, runtime, encoding, and non-ASCII path risks.

## What this is

`pi-env-probe` collects lightweight environment diagnostics. Use it from the CLI, as a Pi slash command, or import `probe()` to get the result object in your own tooling.

## Features

- Detects the current shell (`bash`, `pwsh`, `cmd`, `zsh`, or `null`)
- Reports whether common shells are available in `PATH`
- Detects non-ASCII file/folder names in the current working directory
- Returns the platform path separator (`;` on Windows, `:` on POSIX)
- Lists identified risks in check order: shell, then runtime, then path
- Never throws from `probe()` — subprocess failures degrade to `false` / `null`

## Probe result fields

| Field | Type | Description |
|---|---|---|
| `shell` | `string \| null` | Identified shell name (`"bash"`, `"pwsh"`, `"cmd"`, `"zsh"`, or `null`) |
| `shell_available` | `boolean` | Whether any shell is available in PATH or detected from environment |
| `bash_in_path` | `boolean` | Whether `bash` is found in PATH |
| `pwsh_in_path` | `boolean` | Whether `pwsh` is found in PATH |
| `has_non_ascii_paths_in_cwd` | `boolean` | Whether any direct child of CWD has a non-ASCII name |
| `path_separator` | `string` | Platform path separator (`";"` on Windows, `":"` on POSIX) |
| `node_version` | `string \| null` | Node.js version string (e.g. `"v22.0.0"`), or `null` if unavailable |
| `bun_version` | `string \| null` | Bun version string, or `null` if unavailable |
| `python_version` | `string \| null` | Python version string, or `null` if unavailable |
| `encoding` | `string` | Detected locale encoding from `LC_CTYPE` / `LANG`, defaults to `"utf8"` |
| `risks` | `string[]` | Ordered list of identified issues, empty `[]` when none |

Empty or whitespace-only version output is treated as unavailable. On POSIX, if `python3 --version` fails or returns blank output, the probe tries `python --version`.

### Risk strings

The `risks` array follows the check order shown below, not alphabetical order: shell issues first, runtime issues second, path issues last. Only risks detected by the probe are included.

| Risk string | Condition |
|---|---|
| `"bash_not_in_path"` | `bash_in_path` is `false` |
| `"pwsh_not_in_path"` | `pwsh_in_path` is `false` |
| `"node_not_available"` | `node_version` is `null` |
| `"bun_not_available"` | `bun_version` is `null` |
| `"python_not_available"` | `python_version` is `null` |
| `"non_ascii_paths_in_cwd"` | `has_non_ascii_paths_in_cwd` is `true` |

> The risk array is always present. When no issues are detected it is an empty array `[]`.

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
# default: JSON output
node bin/env-probe.js

# explicit JSON output
node bin/env-probe.js --format json
node bin/env-probe.js --format=json

# human-readable summary of existing probe results
node bin/env-probe.js --format text
node bin/env-probe.js --format=text
```

### CLI output modes

- **Default / `--format json` / `--format=json`**: writes one JSON document per successful CLI invocation to stdout, with two-space indentation and a trailing newline. It is not JSON Lines: read the full stdout stream and parse it once after EOF, not line by line or chunk by chunk.
- **`--format text` / `--format=text`**: emits a human-readable summary derived only from that same probe result (one `probe()` call per invocation). It reports the detected shell state, Node.js/Bun/Python availability and versions when available, and findings from existing risk codes in shell → runtime → path order.
- **Detection limits**: text mode summarizes only the checks `probe()` already performs (shell availability, Node.js/Bun/Python availability, and non-ASCII names directly under the current working directory). It does not claim the entire environment is safe, does not reveal filenames/paths or raw environment/encoding/subprocess values, and does not perform repairs or additional probes.
- **Usage errors**: a missing or unsupported `--format` value, unknown flag, or unexpected positional argument writes a short usage error to stderr, exits non-zero, and writes no diagnostic output to stdout.

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
node bin/env-probe.js | node -e "let json = ''; process.stdin.setEncoding('utf8').on('data', chunk => { json += chunk; }).on('end', () => { JSON.parse(json); console.log('valid JSON'); });"
npm pack --dry-run
```

## Release

This package is set up for npm Trusted Publishing, so no `NPM_TOKEN` is required.

```bash
npm version patch
git push --follow-tags
```

## License

MIT — see [LICENSE](LICENSE).
