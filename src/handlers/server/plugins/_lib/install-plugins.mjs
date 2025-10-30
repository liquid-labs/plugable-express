import * as fs from 'node:fs/promises'

import { install, view, getPackageOrgBasenameAndVersion } from '@liquid-labs/npm-toolkit'

import { PluginError } from './error-utils'

/**
 * Installs plugins based on NPM package names
 * Plugins are identified by the 'pluggable-endpoints' keyword in their package.json
 * @param {Object} options - Installation options
 * @param {Array} options.installedPlugins - Currently installed plugins
 * @param {Array<string>} options.npmNames - NPM package names to install (with optional version specs)
 * @param {string} options.pluginPkgDir - Directory where plugins should be installed
 * @param {Function} options.reloadFunc - Function to call after installation to reload the app
 * @param {Object} options.reporter - Reporter for logging
 * @returns {Promise<{msg: string, data: Object}>} Installation result message and data
 */
const installPlugins = async({
  installedPlugins,
  npmNames,
  pluginPkgDir,
  reloadFunc,
  reporter
}) => {
  const alreadyInstalled = []
  const toInstall = []

  // Filter out already installed packages
  for (const testPackage of npmNames) {
    const { name: testName } = await getPackageOrgBasenameAndVersion(testPackage)
    const matched = installedPlugins.some(({ npmName }) => npmName === testName)

    if (matched === true) {
      alreadyInstalled.push(testName)
    }
    else {
      toInstall.push(testPackage)
    }
  }

  let msg = ''
  const data = {
    installedPlugins : [],
    total            : 0,
    production       : 0
  }

  if (toInstall.length > 0) {
    reporter?.log(`To install: ${toInstall.join(', ')}`)

    // Create plugin directory if it doesn't exist
    await fs.mkdir(pluginPkgDir, { recursive : true })

    // Install packages using npm
    const { productionPackages } = await install({
      packages    : toInstall,
      projectPath : pluginPkgDir
    })

    // Process each installed package and verify it has the correct keyword
    for (const pkgSpec of productionPackages) {
      const { name, version } = await getPackageOrgBasenameAndVersion(pkgSpec)

      // Verify the package has the 'pluggable-endpoints' keyword
      try {
        const packageData = await view({ packageName : name })
        const keywords = packageData?.keywords || []

        if (!keywords.includes('pluggable-endpoints')) {
          reporter?.log(`Warning: Package '${name}' does not have the 'pluggable-endpoints' keyword and may not be a valid plugin`)
        }
      }
      catch (error) {
        reporter?.log(`Warning: Could not verify keywords for package '${name}': ${error.message}`)
      }

      const packageInfo = {
        name,
        version          : version || 'latest',
        fromRegistry     : true,
        hasPluginKeyword : true // Assuming valid if installed
      }

      data.installedPlugins.push(packageInfo)
      data.production++
    }

    // Reload the app if reload function is provided
    if (reloadFunc !== undefined) {
      const reload = reloadFunc()
      if (reload?.then) {
        await reload
      }
    }

    data.total = data.installedPlugins.length

    if (productionPackages.length > 0) {
      msg += '<em>Installed<rst> <code>' + productionPackages.join('<rst>, <code>') + '<rst> production packages\n'
    }
    if (alreadyInstalled.length > 0) {
      msg += '<code>' + alreadyInstalled.join('<rst>, <code>') + '<rst> <em>already installed<rst>.'
    }

    return { msg, data }
  }
  else {
    if (alreadyInstalled.length > 0) {
      msg += '<code>' + alreadyInstalled.join('<rst>, <code>') + '<rst> <em>already installed<rst>.'
    }
    else {
      msg = 'Nothing to install.'
    }

    return { msg, data }
  }
}

const MAX_PACKAGES = 500

const checkMaxPackages = (count) => {
  if (count > MAX_PACKAGES) {
    throw PluginError.resourceLimit('packages', count, MAX_PACKAGES)
  }
}

export { installPlugins, checkMaxPackages }
