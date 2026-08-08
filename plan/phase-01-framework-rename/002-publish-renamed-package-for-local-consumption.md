# Publish Renamed Package for Local Consumption

## Purpose and scope

Task 001 renames this repo's package to `@liquid-labs/plugable-express` (single-g). That rename has no effect on the actual product build until the renamed package reaches its consumers — `@sdlcforge/core-server` (currently pinned to a stale single-g `1.0.0-alpha.55` yalc snapshot) and `@liquid-labs/plugable-express-cli`. This task makes the rename real for those consumers.

A full monorepo migration (collapsing this framework, core-server, the future consolidated domain plugins, and the product package into one workspace) has been decided in principle but its concrete layout, tooling, and location are **not yet decided** — that is an open question tracked at the plan level (see `plan/overview.md`), not something this task should resolve or guess at. This task therefore uses **yalc** as the known-working interim local-linking mechanism, matching how this repo is consumed today, rather than attempting to stand up workspace-level linking prematurely.

## Requirements

- From this repo (after task 001's rename lands), run `yalc publish` to publish the renamed `@liquid-labs/plugable-express@1.0.0-alpha.57` (or whatever version task 001 landed on) to the local yalc store.
- In `@sdlcforge/core-server`'s checkout, run `yalc add @liquid-labs/plugable-express` (or `yalc push` from this repo, whichever this repo's existing yalc workflow convention uses — check `AGENTS.md`'s "Yalc Local Development" section for the established pattern before choosing) to replace the stale `alpha.55` snapshot with the newly renamed `alpha.57`.
- Confirm `core-server`'s `package.json` dependency on `@liquid-labs/plugable-express` is present and unchanged (it should already reference the single-g name — task 001 did not touch consumers, only this repo).
- Repeat the same yalc update for `@liquid-labs/plugable-express-cli` if that repo has a local yalc link to this package (check its `.yalc/` directory).
- Run `core-server`'s test suite (`npm test`, `npm run test:local`) after the yalc update to confirm the renamed package resolves correctly and the server still starts and serves its core endpoints.
- Document, in this task's own outcome (via the task-doc update / structured report), the exact yalc commands used, so a later monorepo migration can replace this interim mechanism with workspace-local dependencies without re-deriving the handoff steps.

## Validation

- `cat core-server/.yalc/@liquid-labs/plugable-express/package.json | grep version` shows the new version (not `1.0.0-alpha.55`).
- `core-server`'s `npm test` and `npm run test:local` both pass.
- `core-server`'s `GET /heartbeat` and `GET /server/version` respond correctly when the server is started locally (`npm start` then curl, or via the existing `test/test-server.js` local integration check).
- No other consumer in the playground is left pointing at the stale `alpha.55` snapshot (spot-check `plugable-express-cli`'s `.yalc/` if present).

## Metadata

architectural_impact: false
