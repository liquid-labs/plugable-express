import { existsSync } from 'node:fs'
import findPlugins from 'find-plugins'
import * as path from 'path'

import { registerHandlers } from './register-handlers'

/**
 * Loads a single plugin.
 */
const loadPlugin = async({ app, cache, reporter, registerPathVar, dir, pkg }) => {
  const { main, name: npmName, description, version } = pkg
  // Since we pull the 'summary' from the package.json description, there may be unecessary context which is clear when
  // asking 'describe this plugin'. So, we look for this specific phrase and remove it.
  const summary = description?.replace(/ +(?:for|in) a @liquid-labs\/pluggable-express server/, '')
  const { handlers, setup } = await import(`${dir}/${main}`) || {}
  if (handlers === undefined && setup === undefined) {
    throw new Error(`Plugin from '${npmName}' does not export 'handlers' or 'setup'; bailing out.`)
  }

  if (setup !== undefined) reporter.log(`Running setup for ${npmName}@${version} plugin...`)
  let setupData = setup?.({ app, cache, reporter, registerPathVar, serverConfigRoot : app.ext.serverConfigRoot })
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
const discoverPluginsByKeyword = async(searchPath, reporter) => {
  const packageJsonPath = path.join(searchPath, 'package.json')
  const nodeModulesPath = path.join(searchPath, 'node_modules')
  const findOptions = { keyword : 'pluggable-endpoints' }

  if (existsSync(packageJsonPath)) {
    findOptions.pkg = packageJsonPath
  }
  if (existsSync(nodeModulesPath)) {
    findOptions.dir = nodeModulesPath
    findOptions.scanAllDirs = true
  }
  if (findOptions.pkg === undefined && findOptions.dir === undefined) {
    reporter?.warn(`Did not find package.json found at ${packageJsonPath} nor node_modules at ${nodeModulesPath}`)
    return []
  }

  const results = await findPlugins(findOptions)
  return results
}

/**
 * Discovers explicit plugins by name, regardless of keyword
 * @param {string} searchPath - Directory to search for package.json and node_modules
 * @param {Array<string>} explicitPlugins - Array of package names to load
 * @param {Object} reporter - Reporter for logging
 * @returns {Promise<Array>} Array of plugin objects with {dir, pkg} structure
 */
const discoverExplicitPlugins = async(searchPath, explicitPlugins, reporter) => {
  const packageJsonPath = path.join(searchPath, 'package.json')
  const nodeModulesPath = path.join(searchPath, 'node_modules')
  const explicitPluginSet = new Set(explicitPlugins)

  const findOptions = {
    filter : (pluginSummary) => explicitPluginSet.has(pluginSummary.pkg?.name)
  }

  if (existsSync(packageJsonPath)) {
    findOptions.pkg = packageJsonPath
  }
  if (existsSync(nodeModulesPath)) {
    findOptions.dir = nodeModulesPath
    findOptions.scanAllDirs = true
  }
  if (findOptions.pkg === undefined && findOptions.dir === undefined) {
    reporter?.warn(`Did not find package.json found at ${packageJsonPath} nor node_modules at ${nodeModulesPath}`)
    return []
  }

  const results = await findPlugins(findOptions)
  return results
}

/**
 * Given an app, cache, reporter, and optional plugin path, loads plugins.
 * If dynamicPluginInstallDir is provided, searches there. Otherwise searches in the current working directory.
 * @param {Object} app - Express app instance
 * @param {Object} options - Loading options
 * @param {Object} options.cache - Cache instance
 * @param {Object} options.reporter - Reporter for logging
 * @param {Function} options.registerPathVar - Function to register path variables
 * @param {string} options.searchPath - Directory to search for plugins
 * @param {Array<string>} options.explicitPlugins - Optional array of package names to explicitly load
 * @param {Set<string>} options.loadedPluginNames - Optional Set to track loaded plugins across multiple calls
 * @returns {Promise<void>}
 */
const loadPlugins = async(app, { cache, reporter, registerPathVar, searchPath, explicitPlugins, loadedPluginNames }) => {
  // Use provided Set or create a new one for this call
  const pluginNames = loadedPluginNames || new Set()

  // First, load explicit plugins if specified
  if (explicitPlugins?.length > 0) {
    reporter.log(`Searching for ${explicitPlugins.length} explicitly specified plugins (in ${searchPath})...`)
    const explicitResults = await discoverExplicitPlugins(searchPath, explicitPlugins, reporter)

    reporter.log(explicitResults.length === 0
      ? 'No explicit plugins found.'
      : `Found ${explicitResults.length} explicit plugins.`)

    for (const plugin of explicitResults) {
      const pluginName = plugin.pkg.name

      // Check for duplicates and warn
      if (pluginNames.has(pluginName)) {
        reporter.log(`Warning: Plugin '${pluginName}' was already loaded from another source, skipping duplicate from '${searchPath}'`)
        continue
      }

      await loadPlugin({ app, cache, reporter, registerPathVar, ...plugin })
      pluginNames.add(pluginName)
    }
  }

  // Then discover and load keyword-based plugins
  reporter.log(`Searching for handler plugins with 'pluggable-endpoints' keyword (in ${searchPath})...`)
  const keywordPlugins = await discoverPluginsByKeyword(searchPath, reporter)

  // Filter out already-loaded plugins to avoid duplicates
  const duplicates = []
  const newPlugins = keywordPlugins.filter(p => {
    if (pluginNames.has(p.pkg.name)) {
      duplicates.push(p.pkg.name)
      return false
    }
    return true
  })

  // Warn about duplicates
  if (duplicates.length > 0) {
    reporter.log(`Warning: Found ${duplicates.length} plugin(s) already loaded from another source, skipping: ${duplicates.join(', ')}`)
  }

  reporter.log(newPlugins.length === 0
    ? 'No additional keyword-based plugins found.'
    : `Found ${newPlugins.length} keyword-based plugins.`)

  for (const plugin of newPlugins) {
    await loadPlugin({ app, cache, reporter, registerPathVar, ...plugin })
    pluginNames.add(plugin.pkg.name)
  }
}

export { loadPlugins }
