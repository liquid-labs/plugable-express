# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@liquid-labs/plugable-express` is an Express-based HTTP server framework with pluggable endpoints and built-in plugin management. The server dynamically loads handler plugins from NPM packages and provides a modular architecture for extending functionality.

Plugins are identified by the `pluggable-endpoints` keyword in their package.json. This allows the framework to automatically discover and load plugins from standard npm dependencies, simplifying the development workflow and leveraging npm's dependency management.

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
- **Plugins** are identified by the `pluggable-endpoints` keyword in their package.json
- **Consumer packages**:
  - add plugins as standard npm dependencies in package.json
  - may also define special handlers, configuration, middleware, etc. for more robust implementations

### Core Components

1. **App Initialization (`src/app.js`)**
   - Main entry point that sets up Express app with `appInit()`
   - Configures middleware (JSON, URL encoding, file upload)
   - Sets up `app.ext` object containing server configuration and state
   - Manages plugin loading and handler registration
   - Key variables:
     - `app.ext.handlerPlugins` - Currently loaded plugins
     - `app.ext.pluginsPath` - Optional directory for plugins (defaults to current working directory)

2. **Plugin System (`src/lib/load-plugins.js`)**
   - **Keyword-Based Discovery**: Plugins are discovered by scanning npm dependencies for the `pluggable-endpoints` keyword
   - **Local-First**: Checks local node_modules first before making network calls for performance
   - Each plugin must export either `handlers` or `setup` (or both)
   - Plugins can register HTTP route handlers and run setup code
   - **Plugin Dependencies**: Use standard npm package.json dependencies/peerDependencies
   - **Validation**: Exports must include `handlers` or `setup`, otherwise throws error

3. **Plugin Management (`src/handlers/server/plugins/`)**
   - Built-in handlers for plugin installation, removal, listing, and details
   - Dynamic runtime plugin installation via HTTP endpoints
   - Keyword verification on installation
   - Support for version specs (`package-name@version`)

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

Plugins must:
1. Include the `pluggable-endpoints` keyword in package.json
2. Export an object with `handlers` or `setup` (or both)

```javascript
// Example plugin structure
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

#### Plugin package.json

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "keywords": ["pluggable-endpoints"],
  "dependencies": {
    "other-plugin": "^2.0.0"
  }
}
```

#### Plugin Dependencies

- Use standard npm `dependencies` or `peerDependencies` in package.json
- NPM handles dependency resolution automatically
- For local development, use `yalc` to link local plugin packages

### Plugin Discovery & Loading Flow

The plugin system uses a simple, efficient keyword-based approach:

1. **Plugin Discovery** (`discoverPlugins` in `src/lib/load-plugins.js`)
   - Reads project's package.json to get all dependencies
   - For each dependency:
     - First checks if installed locally in node_modules
     - Reads local package.json and checks for `pluggable-endpoints` keyword
     - Only makes network call to npm registry if package not installed locally
   - Returns list of plugins with dir and pkg metadata

2. **Plugin Loading** (`loadPlugins` in `src/lib/load-plugins.js`)
   - Loads each discovered plugin via dynamic import
   - Validates plugin exports `handlers` or `setup`
   - Executes plugin's `setup()` function if defined
   - Registers handlers in `app.ext.pendingHandlers` for later execution

3. **Handler Registration** (after all plugins loaded)
   - Executes all pending handlers
   - Registers HTTP endpoints with Express
   - Updates `app.ext.handlerPlugins` list

### Plugin Installation Flow (Dynamic Runtime Installation)

For runtime plugin installation via HTTP endpoints:

1. **Installation Request** (`installPlugins` in `src/handlers/server/plugins/_lib/install-plugins.mjs`)
   - Receives list of NPM package names to install
   - Filters out already installed packages
   - Creates plugin directory if needed

2. **Package Installation**
   - Uses `@liquid-labs/npm-toolkit` to install packages
   - Installs to pluginsPath (if provided) or current working directory
   - Standard npm dependency resolution handles transitive dependencies

3. **Keyword Verification**
   - After installation, verifies each package has `pluggable-endpoints` keyword
   - Logs warnings for packages without the keyword

4. **App Reload**
   - Calls reload function to refresh plugin discovery and loading
   - New plugins become available immediately

**Key Methods:**
- `installPlugins()` - Main entry point for plugin installation (install-plugins.mjs)
- `discoverPlugins()` - Discovers plugins by keyword (load-plugins.js)
- `loadPlugin()` - Loads individual plugin (load-plugins.js)
- `loadPlugins()` - Loads all discovered plugins (load-plugins.js)
- `register-handlers.js` - Registers HTTP handlers from loaded plugins

### Installation Performance Benefits

The current implementation provides several performance advantages:

1. **Local-First Discovery**
   - Checks local node_modules before making network calls
   - Avoids redundant npm registry queries for installed packages
   - Significantly faster startup time

2. **Standard npm Resolution**
   - Leverages npm's battle-tested dependency resolution
   - No custom dependency graph or cycle detection needed
   - Simpler, more reliable installation

3. **Keyword-Based Filtering**
   - Lightweight check for plugin identification
   - No need to download or parse configuration files
   - Minimal overhead during discovery

4. **Optional Dynamic Installation**
   - Runtime installation via HTTP endpoints for admin convenience
   - Most use cases: plugins declared in package.json and installed via npm

### Key Dependencies

- `express` - Web framework (v5.0.0-beta)
- `@liquid-labs/npm-toolkit` - NPM package management, `view()` for metadata, `install()`/`uninstall()` for package management
- `@liquid-labs/dependency-runner` - Dependency management for plugin setup phase
- `@liquid-labs/plugable-defaults` - Default configurations
- `find-root` - Find project root directory
- `js-yaml` - YAML parsing for server settings
- Testing uses `supertest` for HTTP testing

## Code Style

### Exception Handling

- **Log exceptions when first caught** - In general, all exceptions should be logged when first caught, at the point where they can be meaningfully handled
- **Don't catch just to log** - Exceptions should not be caught just to be logged. If you're not handling the error (recovering, retrying, or providing fallback behavior), let it propagate to a handler that can
