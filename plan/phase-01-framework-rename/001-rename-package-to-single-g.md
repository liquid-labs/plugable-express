# Rename Package to Single-G

## Purpose and scope

`@liquid-labs/pluggable-express` (double-g) at `1.0.0-alpha.56` is this repo's package name today, but every consumer in the playground (`@sdlcforge/core-server`'s `src/{cli,lib}/*`, and `plugable-express-cli`) imports `@liquid-labs/plugable-express` (single-g, one fewer 'g'). That single-g name is currently satisfied only by a stale yalc snapshot pinned at `1.0.0-alpha.55` living inside core-server's `.yalc/` directory — there is no single-g source repository anywhere. Practical effect: changes made to this repo today do not reach the product build at all. This is a Phase-0 blocker for the whole SDLCForge/SDLCPilot modernization (see `/tmp/flow-sdlc-modernization/synthesis.md` §7 Phase 0, item 1, and the "spot-check corrections" section for the underlying investigation).

The user has explicitly decided (2026-08-07 planning session): canonicalize on the single-g spelling. This repo is being renamed to match its consumers, not the other way around.

This task covers the rename itself, within this repo only. Task 002 in this phase covers making the renamed package consumable by `core-server` and `plugable-express-cli`.

## Requirements

- Change `package.json` `name` from `@liquid-labs/pluggable-express` to `@liquid-labs/plugable-express`.
- Bump `version` from `1.0.0-alpha.56` to `1.0.0-alpha.57` (or the next appropriate prerelease increment per this repo's existing versioning convention) to mark the renamed package as a new, distinct publishable artifact from the stale `alpha.55` snapshot currently pinned downstream.
- Update every in-repo self-reference to the double-g spelling to single-g:
  - `README.md` (title line and any prose)
  - `AGENTS.md` (prose references — note `CLAUDE.md` is a symlink to `AGENTS.md`, so editing `AGENTS.md` covers both)
  - `DEV_NOTES.md`, `CHANGELOG.md` if they contain self-referential package-name prose (skip historical changelog entries describing past versions — only correct forward-looking/current-state text)
  - Any source file under `src/` — confirmed occurrences as of this task's authoring in: `src/app.js`, `src/server.mjs`, `src/test/lib/test-utils.js`, `src/lib/load-plugins.js`, `src/handlers/server/version.js`, `src/handlers/server/test/version.test.js`. Re-grep before finishing — this list is a starting point, not a guarantee of completeness.
  - `package.json` fields beyond `name` if any reference the double-g spelling (e.g. `repository`, `homepage` — leave GitHub URLs alone if the actual GitHub repo is not being renamed in this task; only change *package name* self-references, not repo URLs, unless the GitHub repo itself is confirmed renamed).
- Do not change the plugin-loading mechanism, the `explicitPlugins` shim, or any other behavior — this is a pure rename, no functional change.
- Do not implement `plugable.yaml`/`product.yaml` manifests or any compile-time composition machinery — that is later-phase work (see `/tmp/flow-sdlc-modernization/synthesis.md` §3), explicitly out of scope here.

## Validation

- `grep -rln "pluggable-express" . --include='*.js' --include='*.mjs' --include='*.md' --include='*.json'` (excluding `node_modules/`, `dist/`, `qa/`, `test-staging/`, `plan/`, `worktrees/`) returns no hits referring to *this package's own name* — a hit inside `plan/` describing this task, or a hit that is a GitHub org/repo URL rather than an npm package-name self-reference, is not a violation and should be judged accordingly, not blindly zeroed out.
- `node -e "console.log(require('./package.json').name)"` prints `@liquid-labs/plugable-express`.
- `npm test` / `make test` passes unchanged (this is a naming-only change; no test should reference the double-g package name in a way that breaks).
- `make lint` / `npm run lint` passes.

## Status

- **Outcome:** succeeded
- **Date:** 2026-08-07
- **Validation summary:** All four validation checks passed. `grep -rln "pluggable-express" . --include='*.js' --include='*.mjs' --include='*.md' --include='*.json'` (excluding `node_modules/`, `dist/`, `qa/`, `test-staging/`, `plan/`, `worktrees/`) returns only expected non-violations: GitHub org/repo URLs in `package.json` (`repository.url`, `bugs.url`, `homepage`), `package.json`'s `main` field (`dist/pluggable-express.js`, left unchanged — see note below), the GitHub badge/issue-link URLs in `README.md`/`src/server.mjs`, and the plan-doc self-references in `plan/`. `node -e "console.log(require('./package.json').name)"` prints `@liquid-labs/plugable-express`. `npm test` passes (15 suites, 173 tests). `npm run lint` passes clean (0 errors after an in-scope `key-spacing`/alignment fix in `src/handlers/server/version.js`, needed because the renamed object key is one character shorter than before).
- **Affected source files:**
  - `package.json` — `name` → `@liquid-labs/plugable-express`, `version` → `1.0.0-alpha.57`
  - `package-lock.json` — top-level and root-package `name`/`version` hand-synced to match (not regenerated via `npm install`, to avoid unrelated `peer` dependency-flag churn from a locally-resolved npm run)
  - `README.md` — title line
  - `AGENTS.md` (and its symlink `CLAUDE.md`) — two prose self-references
  - `CHANGELOG.md` — title line only (all versioned entries below are historical and left untouched)
  - `src/app.js` — `npmName` value passed to `registerHandlers` for core handlers
  - `src/test/lib/test-utils.js` — temp-dir name prefix
  - `src/lib/load-plugins.js` — regex that strips the framework self-reference phrase from plugin descriptions
  - `src/handlers/server/version.js` — the `'pluggable-express'` response key (now `'plugable-express'`) and the matching label in the plain-text message; auto-fixed `key-spacing` alignment on the surrounding object literal as a same-diff self-fix
  - `src/handlers/server/test/version.test.js` — updated assertion to match the renamed response key
- **Not changed (out of scope / flagged):** `package.json`'s `main` field (`dist/pluggable-express.js`) and the machine-generated `make/50-plugable-express-js.mk` (comment banner says "generated by @liquid-labs/catalyst-builder-node") still reference the double-g dist filename. Renaming `main` without regenerating that Makefile would desync the declared entry point from what `make build` actually produces; `## Validation` here doesn't exercise `make build`, so this was left untouched and is flagged below. GitHub org/repo URLs (`package.json` `repository`/`bugs`/`homepage`, the `README.md` CI badge, and the `src/server.mjs` issue-link comment) were left as-is per the task's explicit instruction, since the GitHub repo itself is not confirmed renamed.

## Metadata

architectural_impact: false
