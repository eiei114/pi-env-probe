# Changelog

## [Unreleased]

### Fixed

- Treat blank runtime version output as unavailable and try `python` on POSIX when `python3` returns no version.

## [0.2.0] - 2026-11-18

### Added

- Add opt-in human-readable CLI text output via `--format text` / `--format=text` while keeping JSON output as the default and unchanged.

## [0.1.13] - 2026-11-17

### Changed

- Bump the Pi SDK development pins to 1.5.2 and refresh behavior-v2 smoke evidence against the actual Windows host.

## [0.1.12] - 2026-11-07

### Changed

- Verify the existing Pi SDK 1.5.0 development pins against the actual Windows host and refresh behavior-v2 smoke evidence.

## [0.1.11] - 2026-11-03

### Changed

- Update the `@earendil-works/pi-ai` development pin to 1.4.0 and refresh Pi SDK smoke evidence.

## [0.1.10] - 2026-11-02

### Changed

- Derive actual-host smoke checks from the exact Pi SDK versions pinned in the package manifest.
- Update the `@earendil-works/pi-agent-core` development pin to 1.4.0.

## [0.1.9] - 2026-10-16

### Changed

- Pin Pi SDK development dependencies to 1.2.0 and verify the extension in the actual Pi host.

## [0.1.8] - 2026-10-12

### Changed

- Pin the Pi SDK development dependencies to 1.1.0 and verify the extension in the actual Pi host.

## [0.1.7] - 2026-09-30

### Changed

- Update `@earendil-works/pi-*` dependencies to `0.99.1`.


## 0.1.6 - 2026-09-27

- chore: periodic patch bump after 7+ days without npm publish

## Unreleased

## 0.1.5 - 2026-08-22

### Changed

- Merge the 2026-08-22 managed OSS dependency and maintenance PR batch.

### Changed

- Bump package version to `0.1.3` for the next patch release.

- Align package metadata and extension patterns with pi-extension-template 0.80.x baseline (DOT-823)

## 0.1.2 - 2026-07-04

- retry npm publish after npm registry/trusted publisher settings repair
- normalize CLI bin entries for npm publish metadata

## 0.1.1 - 2026-07-04

- add Buy Me a Coffee support button to the README
- add GitHub funding metadata via `.github/FUNDING.yml`

## 0.1.0 - 2026-07-04

- initial release of `pi-env-probe`
