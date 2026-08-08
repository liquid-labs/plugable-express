# Modernization Foundation — Overview (pluggable-express)

## Purpose and scope

This is Phase 0 ("Preconditions and de-risking") of a larger, multi-phase SDLCForge/SDLCPilot modernization effort. Phase 0 spans five repositories under one shared plan slug (`modernization-foundation`): `@sdlcforge/core-server`, `@liquid-labs/pluggable-express` (this repo), `liq-projects`, `liq-work`, and `sdlcpilot-cli`. The overall modernization (documented in full at `/tmp/flow-sdlc-modernization/synthesis.md`, and rendered at `/tmp/flow-sdlc-modernization/synthesis-artifact.html`) will eventually consolidate ~13 small plugin packages into 4, move plugin composition from runtime/reflective to compile-time, ship a self-contained single-binary CLI via Bun, and add an MCP frontend. Phase 0 only covers foundational de-risking and prerequisites for that later work — it does not implement any of the consolidation, compile-time composition, or binary packaging itself.

This repo's slice of Phase 0: this is the plugin/HTTP framework that `core-server` delegates almost all behavior to. It is currently published under a name (`@liquid-labs/pluggable-express`, double-g) that none of its consumers actually import — they all resolve `@liquid-labs/plugable-express` (single-g) via a stale, disconnected yalc snapshot. This plan resolves that mismatch in the direction the user decided: rename this repo to the single-g spelling, then push the renamed package to its consumers.

## Current status

Plan created 2026-08-07. No tasks started. Phase 1 (`framework-rename`) is the only phase in this repo's slice of Phase 0 and has no dependencies on any other involved project — it is upstream of `core-server`'s own plan, which depends on this phase's task 002 landing before core-server can consume the renamed package (see `plan/manifest.yaml` dependencies, recorded on the core-server project's own manifest).

## Overview

### Phase 1 — Canonicalize on the Single-G Package Name

- **001 — Rename Package to Single-G.** Pure rename: `package.json` name/version, README/AGENTS.md/CLAUDE.md self-references, and every `src/` file that self-references the double-g spelling. No functional change. Must land before task 002.
- **002 — Publish Renamed Package for Local Consumption.** Publishes the renamed package via yalc and updates `core-server` (and `plugable-express-cli`, if locally linked) to consume it, replacing the stale `alpha.55` snapshot. Uses yalc deliberately rather than workspace linking, since the eventual monorepo's concrete layout/tooling/location is not yet decided.

Tasks 001 → 002 are strictly sequential (002 needs 001's renamed package to exist).

## Open questions (not resolved by this plan)

- **Monorepo layout, tooling, and location.** The user has decided *that* this framework, core-server, the future consolidated domain plugins, and the product package should eventually collapse into one workspace — but not the concrete package-manager workspace tooling (npm workspaces / pnpm / turborepo), the new repo's name/location, or migration mechanics. This plan deliberately does not attempt to scaffold that; it uses yalc as a known-working interim mechanism instead. Tracked as an outstanding question via `manifest_patch` on this project.
- **Framework's own independent branding.** The broader modernization synthesis (§8, Open Question 1) raises whether this framework should carry a brand independent of SDLCPilot, since the reusability goal implies eventual standalone publication/adoption. Out of scope for this rename task — the single-g `@liquid-labs/plugable-express` name is the *immediate* fix, not necessarily the final one.
