// Import the installPlugins function from the local library
import { installPlugins } from './install-plugins'

/**
 * Adds plugins to the server.
 *
 * @param {Object} options
 * @param {Object} options.app - The Express app object
 * @param {Object} options.cache - Cache object
 * @param {Array<string>} options.packages - Array of NPM package names to install
 * @param {Object} options.reporter - Reporter for logging
 * @returns {Promise<Object>} Result object with installation details
 */
const addPlugins = async({ app, cache, packages, reporter }) => {
  const installedPlugins = app.ext.handlerPlugins || []
  // Use dynamicPluginInstallDir if provided, otherwise use current working directory
  const pluginPkgDir = app.ext.dynamicPluginInstallDir || app.ext.serverConfigRoot
  const reloadFunc = () => app.reload()

  const result = await installPlugins({
    installedPlugins,
    npmNames : packages,
    pluginPkgDir,
    reloadFunc,
    reporter
  })

  return result
}

export { addPlugins }
