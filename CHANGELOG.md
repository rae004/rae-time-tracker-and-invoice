# Changelog

## [0.2.3](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.2.2...v0.2.3) (2026-08-15)


### Bug Fixes

* **docker:** use --frozen so a release bump can't break the api build ([#93](https://github.com/rae004/rae-time-tracker-and-invoice/issues/93)) ([a2e3afe](https://github.com/rae004/rae-time-tracker-and-invoice/commit/a2e3afe1424941d7d607d03fe83e4a40109461d2))

## [0.2.2](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.2.1...v0.2.2) (2026-08-02)


### Bug Fixes

* **docker:** make both images build from their committed lockfiles ([#91](https://github.com/rae004/rae-time-tracker-and-invoice/issues/91)) ([6778864](https://github.com/rae004/rae-time-tracker-and-invoice/commit/6778864700c644a826df2156c88a0f1bc188c125))

## [0.2.1](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.2.0...v0.2.1) (2026-08-02)


### Bug Fixes

* **invoice:** correct date filter for periods ending late in the month ([#86](https://github.com/rae004/rae-time-tracker-and-invoice/issues/86)) ([6f8499d](https://github.com/rae004/rae-time-tracker-and-invoice/commit/6f8499ddf67eaa0d82567b96bfa4052290480e7f))

## [0.2.0](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.9...v0.2.0) (2026-06-28)


### Features

* -&gt; minor, fix:/chore: -&gt; patch, breaking change -&gt; major. ([7223b4e](https://github.com/rae004/rae-time-tracker-and-invoice/commit/7223b4e8bac74b48c499e1f29f80dd31e1f16ffc))
* let commits bump the minor in pre-1.0 ([#64](https://github.com/rae004/rae-time-tracker-and-invoice/issues/64)) ([7223b4e](https://github.com/rae004/rae-time-tracker-and-invoice/commit/7223b4e8bac74b48c499e1f29f80dd31e1f16ffc))

## [0.1.9](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.8...v0.1.9) (2026-06-28)


### Features

* **invoice:** show total hours on invoice + add precheck.sh ([#62](https://github.com/rae004/rae-time-tracker-and-invoice/issues/62)) ([a55c883](https://github.com/rae004/rae-time-tracker-and-invoice/commit/a55c883164b5063bfc98a052a35828bc93459b21))

## [0.1.8](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.7...v0.1.8) (2026-05-25)


### Features

* show running timer in browser tab title ([#41](https://github.com/rae004/rae-time-tracker-and-invoice/issues/41)) ([c59e758](https://github.com/rae004/rae-time-tracker-and-invoice/commit/c59e7585afbff9693577db19156b28c954f5fcc1))

## [0.1.7](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.6...v0.1.7) (2026-05-24)


### Bug Fixes

* use npm ecosystem for Dependabot frontend updates ([#37](https://github.com/rae004/rae-time-tracker-and-invoice/issues/37)) ([d9dcd30](https://github.com/rae004/rae-time-tracker-and-invoice/commit/d9dcd301b96c303df042cc770ec36a473b7d2433))

## [0.1.6](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.5...v0.1.6) (2026-05-24)


### Bug Fixes

* stop leaking exception details to API clients (CWE-209) ([#33](https://github.com/rae004/rae-time-tracker-and-invoice/issues/33)) ([672d131](https://github.com/rae004/rae-time-tracker-and-invoice/commit/672d131cfa67a1e7db52299e750a0b466c48935b))

## [0.1.5](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.4...v0.1.5) (2026-05-10)


### Features

* add full-data export/import/reset under Settings → Data tab ([d6cafdb](https://github.com/rae004/rae-time-tracker-and-invoice/commit/d6cafdbd36101741102fccce5a6871844b6be0fa))
* add full-data export/import/reset under Settings → Data tab ([3560cb8](https://github.com/rae004/rae-time-tracker-and-invoice/commit/3560cb8c482968a6fd5a81eca9391f228e9ea0f6))

## [0.1.4](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.3...v0.1.4) (2026-05-10)


### Bug Fixes

* sync time entry edit form state when entering edit mode ([3206244](https://github.com/rae004/rae-time-tracker-and-invoice/commit/320624448467c135713a997c6150c6540863c7a8))
* sync time entry edit form state when entering edit mode ([1992c95](https://github.com/rae004/rae-time-tracker-and-invoice/commit/1992c953cbad54242aa1ed40cccf10294845b4d4))

## [0.1.3](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.2...v0.1.3) (2026-05-03)


### Features

* combine same-day invoice line items + fix dev container venv mount ([2220ed2](https://github.com/rae004/rae-time-tracker-and-invoice/commit/2220ed2731d12e533b185d0b106d29e901c470ef))

## [0.1.2](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.1...v0.1.2) (2026-04-27)


### Features

* add time_entry_name to invoice line items ([c2662f8](https://github.com/rae004/rae-time-tracker-and-invoice/commit/c2662f83bd29c38dc5af00e78485e04086d8b40d))
* add time_entry_name to invoice line items + boost frontend coverage ([b50696a](https://github.com/rae004/rae-time-tracker-and-invoice/commit/b50696affb449ff52ef815534fd74780f1c89dfe))

## [0.1.1](https://github.com/rae004/rae-time-tracker-and-invoice/compare/v0.1.0...v0.1.1) (2026-04-26)


### Features

* add admin settings UI for profile, clients, and tags (Phase 3) ([46df05e](https://github.com/rae004/rae-time-tracker-and-invoice/commit/46df05e14d36e433f61afddb5b4f8d250faccc07))
* add invoice generation and management (Phase 4) ([16b88d4](https://github.com/rae004/rae-time-tracker-and-invoice/commit/16b88d418c5de8003349273ea6438a06fcd44083))
* add millisecond precision, quick-start timer, and fix time accuracy ([10f24f3](https://github.com/rae004/rae-time-tracker-and-invoice/commit/10f24f3dba983cf90cfa60f9fa90bc01b79da202))
* add second and millisecond precision to time entry editing ([9ff8438](https://github.com/rae004/rae-time-tracker-and-invoice/commit/9ff843824f02e7d651d55ecd721936b427693562))
* add start/end time editing to time entry card ([8a6bdda](https://github.com/rae004/rae-time-tracker-and-invoice/commit/8a6bdda3c5e66225b2bec3257c22ac3e486eedfb))
* implement time tracking app with Phase 1 & 2 complete ([9edeb78](https://github.com/rae004/rae-time-tracker-and-invoice/commit/9edeb784ae8140d03a7f14fc7f285c2023add136))
* time tracking app with invoicing, ms precision, tests, and CI/CD setup ([14eca13](https://github.com/rae004/rae-time-tracker-and-invoice/commit/14eca13492bc7480aa08b588c74c09d09b527460))


### Bug Fixes

* add vitest global types to tsconfig for CI type-checking ([f21fca0](https://github.com/rae004/rae-time-tracker-and-invoice/commit/f21fca0f96207434563c8d545f4f87dda5948dba))

## Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Releases are managed automatically by [release-please](https://github.com/googleapis/release-please) based on [Conventional Commits](https://www.conventionalcommits.org/).
