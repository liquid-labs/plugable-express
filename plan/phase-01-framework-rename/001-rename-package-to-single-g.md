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

## Metadata

architectural_impact: false
