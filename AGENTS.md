# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@liquid-labs/plugable-express` is an Express-based HTTP server framework with pluggable endpoints and built-in plugin management. The server dynamically loads handler plugins from NPM packages and provides a modular architecture for extending functionality.

This package is designed to be used by consumer packages which determine the plugins to install and may implement some handlers directly to provide a complete feature set. Plugin dependencies are self-contained with transitive installation handled automatically through YAML-based dependency specifications.

## Build and Development Commands

```bash
# Build the project (uses Makefile with Rollup)
make build
# or
npm run build

# Run tests (uses Jest via Makefile)
make test
# or
npm test

# Run a specific test file
make test TEST=path/to/test.js

# Lint the code (and fix issues; uses ESLint via Makefile)
# It's generally not necessary to lint and fix seperately
make lint-fix
# or
npm run lint:lint

# Run full QA (tests + lint)
make qa
# or
npm run qa
```

## Architecture

### Framework Ecosystem

`@liquid-labs/plugable-express` serves as a framework for building modular HTTP servers. In the ecosystem:
- **This framework** provides the core plugin loading and management infrastructure
- **Consumer packages** define standard plugin sets via the `standardPackages` parameter
- **Final server packages** can be relatively thin wrappers that primarily specify a plugin install list
- **Server packages** may also define special handlers, configuration, middleware, etc. for more robust implementations

### Core Components

1. **App Initialization (`src/app.js`)**
   - Main entry point that sets up Express app with `appInit()`
   - Configures middleware (JSON, URL encoding, file upload)
   - Sets up `app.ext` object containing server configuration and state
   - Manages plugin loading and handler registration
   - **Standard Packages Support**: Accepts `standardPackages` parameter (array of NPM package names) that are automatically installed as plugins on server startup (src/app.js:36-37, 134-169)
   - Key variables:
     - `standardPackages` - Array of NPM package / plugin names to auto-install (src/app.js:36-37)
     - `app.ext.handlerPlugins` - Currently installed plugins (src/app.js:142)
     - `app.ext.pluginsPath` - Directory where plugins are installed (src/app.js:157)

2. **Plugin System (`src/lib/load-plugins.js`)**
   - Plugins are NPM packages loaded from a configurable plugin directory
   - Each plugin must export either `handlers` or `setup` (or both)
   - Plugins can register HTTP route handlers and run setup code
   - Plugin discovery uses the `find-plugins` package to scan node_modules
   - **Plugin Dependencies**: Dependencies are specified in `plugable-express.yaml` files within each plugin package
   - **Transitive Installation**: Plugin dependencies are automatically resolved and installed in the correct order

3. **Plugin Management (`src/handlers/server/plugins/`)**
   - Built-in handlers for plugin installation, removal, listing, and details
   - Support for both string dependencies (`package-name`) and object format with version specs (`{npmPackage: 'name', version: '^1.0.0'}`)
   - Automatic installation of transitive dependencies

4. **Handler Registration (`src/lib/register-handlers.js`)**
   - Handles registration of HTTP endpoints from plugins
   - Supports parameterized paths and regular expressions
   - Manages handler lifecycle and error handling
   - Provides automatic API documentation generation

5. **Server Settings Management**
   - `initServerSettings()` - initializes server configuration
   - `getServerSettings()` - retrieves current settings
   - Settings stored in YAML files in the server home directory

### Directory Structure

- `src/` - Source code
  - `app.js` - Main application initialization
  - `server.mjs` - Server startup logic
  - `handlers/` - Core built-in handlers
    - `heartbeat.mjs` - Health check endpoint
    - `help/` - Help system handlers
    - `server/` - Server management endpoints
  - `lib/` - Core library functions
    - `load-plugins.js` - Plugin loading system
    - `register-handlers.js` - Handler registration
    - `reporter.js` - Logging/reporting utility
  - `test/` - Test files

### Build System

The project uses a Makefile-based build system with:
- Babel for transpilation (config from `@liquid-labs/catalyst-resource-babel-and-rollup`)
- Rollup for bundling
- Jest for testing (config from `@liquid-labs/catalyst-resource-jest`)
- ESLint for linting (config from `@liquid-labs/catalyst-resource-eslint`)

Build artifacts go to:
- `dist/` - Production build output
- `qa/` - Test reports and coverage
- `test-staging/` - Temporary test build files

### Plugin Development

Plugins must export an object with:
```javascript
export const handlers = [
  {
    method: 'GET',
    path: '/my-endpoint',
    handler: async (req, res) => { /* ... */ }
  }
]

export const setup = async ({ app, cache, reporter }) => {
  // Optional setup code
  return setupData // Available to handlers
}
```

#### Plugin Dependencies

Plugin dependencies are specified in a `plugable-express.yaml` file in the root of the plugin package:

```yaml
dependencies:
  - package-name              # Simple package name (latest version)
  - other-package@2.x         # Package name + version spec
  - npmPackage: third-package # Object format with optional version
    version: "^1.2.0"         # Semver range specification
```

Dependencies support:
- **String format**: Simple package names install the latest version
- **Object format**: Explicit version control with semver ranges (^, ~, exact versions)
- **Transitive resolution**: Dependencies of dependencies are automatically discovered and installed

### Plugin Installation Flow

The plugin installation process uses an efficient multi-phase approach that discovers all dependencies BEFORE installing any packages:

1. **Initial Installation Request** (`installPlugins` in `src/handlers/server/plugins/_lib/install-plugins.mjs`)
   - Receives a list of NPM package names to install (with optional version ranges / tags)
   - Filters out already installed packages
   - Creates plugin directory if it doesn't exist
   - Initiates dependency discovery phase

2. **Dependency Discovery Phase** (`discoverAllDependencies` in `install-plugins.mjs`)
   - Uses `npm view` to fetch package metadata WITHOUT installing packages
   - For each package, calls `fetchPackageDependencies()` to discover all dependencies
   - Builds complete dependency graph before any installation
   - Validates for cyclic dependencies during graph construction
   - Returns complete set of packages to install

3. **Multi-Source Dependency Fetching** (`fetchPackageDependencies` in `install-plugins.mjs`)
   - **Version Range Resolution**: If `npm view` returns array (for ranges like `1.x`, `^2.0.0`), selects latest version using `@liquid-labs/semver-plus.rsort()`
   - **npm package.json dependencies**: Extracted directly from `npm view` results
   - **plugable-express.yaml dependencies**: Fetched via multi-tier approach:
     - **GitHub-first**: `getPlugableExpressYamlFromGitHub()` attempts to fetch from `https://raw.githubusercontent.com/{owner}/{repo}/v{version}/plugable-express.yaml`
       - Parses repository URL from package metadata
       - Constructs raw GitHub URL using version tag (e.g., `v1.2.0`)
       - Returns `null` if not GitHub-hosted or file doesn't exist (404)
     - **Tarball fallback**: If GitHub fetch fails, downloads and extracts package tarball, then uses `readPackageDependencies()`
       - Uses dynamic import for `tar` package (only loaded when fallback is needed)
       - Downloads tarball to temp directory
       - Extracts and reads `plugable-express.yaml` from filesystem
       - Cleans up temp files after extraction
   - Returns combined list of all dependencies (npm + plugable-express.yaml)

4. **Cyclic Dependency Prevention**
   - Uses `dependency-graph` package to detect cycles BEFORE installation begins
   - Adds edges to graph during discovery phase
   - Throws error immediately if circular dependencies are detected
   - Prevents any packages from being installed if cycles exist

5. **Bulk Installation Phase** (`installAll` in `install-plugins.mjs`)
   - After successful discovery and validation, installs ALL packages in one operation
   - Uses `@liquid-labs/npm-toolkit` install with complete package list
   - Supports both local (dev) and production package installation
   - Much more efficient than installing packages one-by-one

6. **Plugin Setup Phase** (after all packages are installed)
   - Once all plugin packages are installed, the setup process begins
   - Uses `@liquid-labs/dependency-runner` to resolve inter-plugin dependencies
   - Ensures plugins are initialized in the correct order based on their dependencies

**Key Methods:**
- `installPlugins()` - Main entry point for plugin installation (install-plugins.mjs:21-130)
- `fetchPackageDependencies()` - Fetches dependencies from npm metadata and plugable-express.yaml (install-plugins.mjs:242-318)
- `getPlugableExpressYamlFromGitHub()` - Attempts GitHub fetch for plugable-express.yaml (install-plugins.mjs:154-232)
- `discoverAllDependencies()` - Recursively discovers all dependencies using npm view (install-plugins.mjs:320-380)
- `installAll()` - Discovers dependencies and performs bulk installation (install-plugins.mjs:382-405)
- `readPackageDependencies()` - Reads and parses plugable-express.yaml from filesystem (read-package-dependencies.mjs)
- `load-plugins.js` - Discovers and loads installed plugins
- `register-handlers.js` - Registers HTTP handlers from loaded plugins

### Installation Performance Benefits

The current implementation provides significant performance advantages over traditional approaches:

1. **No Redundant Installations**
   - Dependencies are discovered via `npm view` metadata queries, not by installing packages
   - Packages are only installed once after complete dependency graph is built
   - Eliminates duplicate installations during discovery phase

2. **GitHub-First Approach**
   - For GitHub-hosted packages, fetches `plugable-express.yaml` directly from raw content URL
   - Avoids downloading and extracting entire package tarballs when possible
   - Significantly faster than tarball extraction for dependency discovery

3. **Version Range Optimization**
   - Intelligently resolves version ranges (e.g., `1.x`, `^2.0.0`) to latest matching version
   - Uses semver sorting to select optimal version without trial-and-error

4. **Early Failure Detection**
   - Cyclic dependencies detected during discovery phase before any installation
   - Prevents partial installations that would need to be rolled back

5. **Bulk Installation**
   - All packages installed in single operation after discovery
   - Reduces npm registry requests and improves parallel download efficiency

### Key Dependencies

- `express` - Web framework (v5.0.0-beta)
- `@liquid-labs/npm-toolkit` - NPM package management, `view()` for metadata, and version parsing
- `@liquid-labs/semver-plus` - Semver utilities including `rsort()` for version range resolution
- `@liquid-labs/dependency-runner` - Dependency management for plugin setup phase
- `@liquid-labs/plugable-defaults` - Default configurations
- `dependency-graph` - Cyclic dependency detection during installation
- `find-plugins` - Plugin discovery in node_modules
- `js-yaml` - YAML parsing for plugable-express.yaml files
- `tar` - Tarball extraction (dynamic import, used as fallback for dependency discovery)
- `https` - Native Node.js module for GitHub raw content fetching
- Testing uses `supertest` for HTTP testing

## Code Style

### Exception Handling

- **Log exceptions when first caught** - In general, all exceptions should be logged when first caught, at the point where they can be meaningfully handled
- **Don't catch just to log** - Exceptions should not be caught just to be logged. If you're not handling the error (recovering, retrying, or providing fallback behavior), let it propagate to a handler that can
