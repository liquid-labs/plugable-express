import { existsSync } from 'node:fs'
import findPlugins from 'find-plugins'
import * as path from 'path'

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
  // return await findPlugins(findOptions)
  const results = await findPlugins(findOptions)
  return results
}

/**
 * Given an app, cache, reporter, and optional plugin path, loads plugins.
 * If dynamicPluginInstallDir is provided, searches there. Otherwise searches in the current working directory.
 */
const loadPlugins = async(app, { cache, reporter, searchPath }) => {
  reporter.log(`Searching for handler plugins with 'pluggable-endpoints' keyword (in ${searchPath})...`)

  const plugins = await discoverPlugins(searchPath, reporter)

  reporter.log(plugins.length === 0 ? 'No plugins found.' : `Found ${plugins.length} plugins.`)

  for (const plugin of plugins) {
    await loadPlugin({ app, cache, reporter, ...plugin })
  }
}

export { loadPlugins }
