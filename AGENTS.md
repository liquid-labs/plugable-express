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
     - `standardPackages` - Array of NPM package names to auto-install (src/app.js:36-37)
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
  - npmPackage: other-package # Object format with optional version
    version: "^1.2.0"         # Semver range specification
```

Dependencies support:
- **String format**: Simple package names install the latest version
- **Object format**: Explicit version control with semver ranges (^, ~, exact versions)
- **Transitive resolution**: Dependencies of dependencies are automatically discovered and installed

### Plugin Installation Flow

The plugin installation process follows a recursive pattern to handle transitive dependencies:

1. **Initial Installation Request** (`installPlugins` in `src/handlers/server/plugins/_lib/install-plugins.mjs`)
   - Receives a list of NPM package names to install
   - Filters out already installed packages
   - Creates plugin directory if it doesn't exist

2. **Recursive Installation** (`installAll` in `install-plugins.mjs`)
   - Installs requested packages using `@liquid-labs/npm-toolkit`
   - For each installed package, reads its `plugable-express.yaml` file
   - Discovers dependencies using `readPackageDependencies` (`src/handlers/server/plugins/_lib/installation-order.mjs`)
   - Recursively calls `installAll` for any discovered dependencies
   - Tracks all installed packages to prevent duplicate installations

3. **Dependency Discovery** (`readPackageDependencies` in `installation-order.mjs`)
   - Reads `plugable-express.yaml` from package root in node_modules
   - Parses YAML safely to extract dependency declarations
   - Returns array of dependency package specifications

4. **Cyclic Dependency Prevention**
   - During recursive installation, the system tracks the installation chain
   - Uses `dependency-graph` package to detect cycles before installation
   - Throws error if circular dependencies are detected

5. **Plugin Setup Phase** (after all packages are installed)
   - Once all plugin packages are installed, the setup process begins
   - Uses `@liquid-labs/dependency-runner` to resolve inter-plugin dependencies
   - Ensures plugins are initialized in the correct order based on their dependencies

**Key Methods:**
- `installPlugins()` - Main entry point for plugin installation
- `installAll()` - Recursive function that installs packages and their dependencies
- `readPackageDependencies()` - Reads and parses plugin dependency declarations
- `load-plugins.js` - Discovers and loads installed plugins
- `register-handlers.js` - Registers HTTP handlers from loaded plugins

### Key Dependencies

- `express` - Web framework (v5.0.0-beta)
- `@liquid-labs/npm-toolkit` - NPM package management and version parsing
- `@liquid-labs/dependency-runner` - Dependency management
- `@liquid-labs/plugable-defaults` - Default configurations
- `dependency-graph` - Plugin dependency resolution
- `find-plugins` - Plugin discovery
- `yaml` - YAML configuration parsing
- Testing uses `supertest` for HTTP testing

## Code Style

### Exception Handling

- **Log exceptions when first caught** - In general, all exceptions should be logged when first caught, at the point where they can be meaningfully handled
- **Don't catch just to log** - Exceptions should not be caught just to be logged. If you're not handling the error (recovering, retrying, or providing fallback behavior), let it propagate to a handler that can
