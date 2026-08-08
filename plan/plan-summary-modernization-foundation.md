# Plan Summary: modernization-foundation

## What was planned and why

This is Phase 0 ("Preconditions and de-risking") of a larger, multi-phase SDLCForge/SDLCPilot modernization effort. Phase 0 spans five repositories under one shared plan slug (`modernization-foundation`): `@sdlcforge/core-server`, `@liquid-labs/pluggable-express` (this repo), `liq-projects`, `liq-work`, and `sdlcpilot-cli`. The overall modernization (documented in full at `/tmp/flow-sdlc-modernization/synthesis.md`, and rendered at `/tmp/flow-sdlc-modernization/synthesis-artifact.html`) will eventually consolidate ~13 small plugin packages into 4, move plugin composition from runtime/reflective to compile-time, ship a self-contained single-binary CLI via Bun, and add an MCP frontend. Phase 0 only covers foundational de-risking and prerequisites for that later work — it does not implement any of the consolidation, compile-time composition, or binary packaging itself.

This repo's slice of Phase 0: this is the plugin/HTTP framework that `core-server` delegates almost all behavior to. It is currently published under a name (`@liquid-labs/pluggable-express`, double-g) that none of its consumers actually import — they all resolve `@liquid-labs/plugable-express` (single-g) via a stale, disconnected yalc snapshot. This plan resolves that mismatch in the direction the user decided: rename this repo to the single-g spelling, then push the renamed package to its consumers.

### Phase 1 — Canonicalize on the Single-G Package Name

- **001 — Rename Package to Single-G.** Pure rename: `package.json` name/version, README/AGENTS.md/CLAUDE.md self-references, and every `src/` file that self-references the double-g spelling. No functional change. Must land before task 002.
- **002 — Publish Renamed Package for Local Consumption.** Publishes the renamed package via yalc and updates `core-server` (and `plugable-express-cli`, if locally linked) to consume it, replacing the stale `alpha.55` snapshot. Uses yalc deliberately rather than workspace linking, since the eventual monorepo's concrete layout/tooling/location is not yet decided.

Tasks 001 → 002 are strictly sequential (002 needs 001's renamed package to exist).

## What shipped

### Phase 01 — Canonicalize on the Single-G Package Name

1. **Rename Package to Single-G** (`001-rename-package-to-single-g.md`, tier `sonnet-med`) — Renamed the package from @liquid-labs/pluggable-express to @liquid-labs/plugable-express (single-g) and bumped the version to 1.0.0-alpha.57. Updated every in-repo self-reference confirmed by the task doc plus a fresh case-insensitive re-grep. GitHub org/repo URLs and the main/dist-build-filename chain were deliberately left untouched, per the task's own scoping instructions. All validation checks (grep, name resolution, npm test, npm run lint) pass; no functional behavior changed beyond the naming.
   Commit `7c385de`, merged at `8bd36bd`.

2. **Publish Renamed Package for Local Consumption** (`002-publish-renamed-package-for-local-consumption.md`, tier `sonnet-low`) — Ran yalc publish from this repo, publishing the renamed @liquid-labs/plugable-express@1.0.0-alpha.57 into the local yalc store; prepack (make build) succeeded. Checked plugable-express-cli for a local yalc link and found none. Per manager scope narrowing, no changes were made to core-server — that is core-server's own downstream task 002.
   Commit `da98426`, merged at `d7cec25`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Follow-up items

- **`AYlt`** — **package.json's main field (dist/pluggable-exp** — package.json's main field (dist/pluggable-express.js) and the generated make/50-plugable-express-js.mk still reference the double-g dist filename; a full rename of the build-output name requires regenerating that Makefile via its own generator tool, out of this task's scope. Worth a follow-up if make build/publish is exercised before the generator is re-run.

- **`2GL8`** — **Pre-existing, unrelated latent bug in src/han** — Pre-existing, unrelated latent bug in src/handlers/server/version.js: the plain-text response template reads versionInfo.server (line 34), but the object has no server property (always undefined). Predates the rename, not caught by any test, left untouched as a behavior change outside this pure-rename task's scope.

- **`4lJu`** — **plugable-express-cli's package.json still dep** — plugable-express-cli's package.json still depends on the old double-g package name @liquid-labs/pluggable-express@^1.0.0-alpha.56, not the renamed single-g @liquid-labs/plugable-express, and has no yalc link to either. Outside this task's scope (a different repo). Consider a follow-up task for plugable-express-cli's own consumer-side rename adoption, parallel to core-server's task 002.

- **`MRt3`** — **Fix versionInfo.server undefined bug** — src/handlers/server/version.js's plain-text response template reads `versionInfo.server` (undefined — the object has no `server` key; the actual value lives under the `'plugable-express'` key). Pre-existing bug, predates the framework-rename plan and not introduced by it — the /server/version plain-text response always prints "plugable-express: undefined". Fix: change `versionInfo.server` to `versionInfo['plugable-express']` (or similar) at that line.

- **`53ZB`** — **Add AGENTS.md Yalc Local Dev section** — Task 002 of the framework-rename phase instructed its implementer to consult AGENTS.md's "Yalc Local Development" section to choose between `yalc add` and `yalc push` conventions, but no such section exists in AGENTS.md today (only a single generic "use yalc to link local plugin packages" line at AGENTS.md:160). Didn't block the task, but worth adding that section (or fixing the reference) for future yalc-related task-doc authoring.

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 01 — Canonicalize on the Single-G Package Name

- [x] [001-rename-package-to-single-g.md](./phase-01-framework-rename/001-rename-package-to-single-g.md) — tier `sonnet-med` · branch `plan/modernization-foundation-01-001` · commit `7c385de` · merge `8bd36bd`
- [x] [002-publish-renamed-package-for-local-consumption.md](./phase-01-framework-rename/002-publish-renamed-package-for-local-consumption.md) — tier `sonnet-low` · branch `plan/modernization-foundation-01-002` · commit `da98426` · merge `d7cec25`
