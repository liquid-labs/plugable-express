# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@liquid-labs/plugable-express` is an Express-based HTTP server with pluggable endpoints and built-in plugin management. The server dynamically loads handler plugins from NPM packages and provides a modular architecture for extending functionality.

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

# Lint the code (uses ESLint via Makefile)
make lint
# or
npm run lint

# Fix linting issues
make lint-fix
# or
npm run lint:fix

# Run full QA (tests + lint)
make qa
# or
npm run qa
```

## Architecture

### Framework Ecosystem

`@liquid-labs/plugable-express` serves as a framework for building modular HTTP servers. In the ecosystem:
- **This framework** provides the core plugin loading and management infrastructure
- **Tools built on top** can define standard plugin sets via the `standardPackages` parameter
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
   - **Auto-installation**: Standard packages are installed automatically via `@liquid-labs/liq-plugins-lib` if not already present (src/app.js:151-161)

3. **Handler Registration (`src/lib/register-handlers.js`)**
   - Handles registration of HTTP endpoints from plugins
   - Supports parameterized paths and regular expressions
   - Manages handler lifecycle and error handling
   - Provides automatic API documentation generation

4. **Server Settings Management**
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

### Key Dependencies

- `express` - Web framework (v5.0.0-beta)
- `@liquid-labs/dependency-runner` - Dependency management
- `@liquid-labs/plugable-defaults` - Default configurations
- `find-plugins` - Plugin discovery
- Testing uses `supertest` for HTTP testing

## Code Style

### Exception Handling

- **Log exceptions when first caught** - In general, all exceptions should be logged when first caught, at the point where they can be meaningfully handled
- **Don't catch just to log** - Exceptions should not be caught just to be logged. If you're not handling the error (recovering, retrying, or providing fallback behavior), let it propagate to a handler that can