import { existsSync, readFileSync } from 'node:fs'
import * as path from 'path'

import { view } from '@liquid-labs/npm-toolkit'

import { registerHandlers } from './register-handlers'

/**
 * Loads a single plugin.
 */
const loadPlugin = async({ app, cache, reporter, dir, pkg }) => {
  const { main, name: npmName, description, version } = pkg
  // Since we pull the 'summary' from the package.json description, there may be unecessary context which is clear when
  // asking 'describe this plugin'. So, we look for this specific phrase and remove it.
  const summary = description?.replace(/ +(?:for|in) a @liquid-labs\/plugable-express server/, '')
  const { handlers, setup } = await import(`${dir}/${main}`) || {}
  if (handlers === undefined && setup === undefined) {
    throw new Error(`Plugin from '${npmName}' does not export 'handlers' or 'setup'; bailing out.`)
  }

  if (setup !== undefined) reporter.log(`Running setup for ${npmName}@${version} plugin...`)
  let setupData = setup?.({ app, cache, reporter })
  if (setupData?.then !== undefined) {
    setupData = await setupData
  }

  app.ext.pendingHandlers.push(() => {
    if (handlers !== undefined) {
      registerHandlers(app, { npmName, handlers, reporter, setupData, cache })
    }

    app.ext.handlerPlugins.push({ summary, npmName, version })
  })
}

/**
 * Discovers plugins by scanning dependencies for the 'pluggable-endpoints' keyword
 * @param {string} searchPath - Directory to search for package.json and node_modules
 * @param {Object} reporter - Reporter for logging
 * @returns {Promise<Array>} Array of plugin objects with {dir, pkg} structure
 */
const discoverPlugins = async(searchPath, reporter) => {
  const packageJsonPath = path.join(searchPath, 'package.json')
  const nodeModulesPath = path.join(searchPath, 'node_modules')

  if (!existsSync(packageJsonPath)) {
    reporter?.log(`No package.json found at ${packageJsonPath}`)
    return []
  }

  // Read dependencies from package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  }

  const plugins = []

  // Check each dependency for the 'pluggable-endpoints' keyword
  for (const [depName] of Object.entries(dependencies || {})) {
    try {
      const depPath = path.join(nodeModulesPath, depName)
      const depPackageJsonPath = path.join(depPath, 'package.json')

      // First, check if package is installed locally
      if (existsSync(depPackageJsonPath)) {
        const depPackageJson = JSON.parse(readFileSync(depPackageJsonPath, 'utf8'))
        const localKeywords = depPackageJson.keywords || []

        if (localKeywords.includes('pluggable-endpoints')) {
          // Package is installed and has the keyword - use it!
          plugins.push({
            dir : depPath,
            pkg : depPackageJson
          })

          reporter?.log(`Found plugin: ${depName}@${depPackageJson.version}`)
        }
      }
      else {
        // Package not installed - check registry to see if it has the keyword
        const packageData = await view({ packageName : depName })
        const keywords = packageData?.keywords || []

        if (keywords.includes('pluggable-endpoints')) {
          reporter?.log(`Warning: Plugin ${depName} has 'pluggable-endpoints' keyword but is not installed`)
        }
      }
    }
    catch (error) {
      reporter?.log(`Warning: Could not check keywords for ${depName}: ${error.message}`)
    }
  }

  return plugins
}

/**
 * Given an app, cache, reporter, and optional plugin path, loads plugins.
 * If pluginsPath is provided, searches there. Otherwise searches in the current working directory.
 */
const loadPlugins = async(app, { cache, reporter, pluginsPath }) => {
  // Use pluginsPath if provided, otherwise use current working directory
  const searchPath = pluginsPath || process.cwd()

  reporter.log(`Searching for handler plugins with 'pluggable-endpoints' keyword (in ${searchPath})...`)

  const plugins = await discoverPlugins(searchPath, reporter)

  reporter.log(plugins.length === 0 ? 'No plugins found.' : `Found ${plugins.length} plugins.`)

  for (const plugin of plugins) {
    await loadPlugin({ app, cache, reporter, ...plugin })
  }
}

export {
  loadPlugin,
  loadPlugins
}
