import * as fs from 'node:fs/promises'

import { install } from '@liquid-labs/npm-toolkit'

import { determineInstallationOrder } from './installation-order'

/**
 * Installs plugins based on NPM package names
 * @param {Object} options - Installation options
 * @param {Object} options.app - Express app object
 * @param {Array} options.installedPlugins - Currently installed plugins
 * @param {Array<string>} options.npmNames - NPM package names to install
 * @param {string} options.pluginPkgDir - Directory where plugins should be installed
 * @param {Function} options.reloadFunc - Function to call after installation to reload the app
 * @param {Object} options.reporter - Reporter for logging
 * @returns {Promise<string>} Installation result message
 */
const installPlugins = async({
  app,
  installedPlugins,
  npmNames,
  pluginPkgDir,
  reloadFunc,
  reporter
}) => {
  const alreadyInstalled = []
  const toInstall = []

  for (const testPackage of npmNames) {
    const testName = testPackage.replace(/(.)@.*/, '$1')
    const matched = installedPlugins.some(({ npmName }) => npmName === testName)

    if (matched === true) {
      alreadyInstalled.push(testName)
    }
    else {
      toInstall.push(testPackage)
    }
  }

  let msg = ''
  if (toInstall.length > 0) {
    const installSeries = await determineInstallationOrder({
      installedPlugins,
      packageDir : pluginPkgDir,
      toInstall
    })

    await fs.mkdir(pluginPkgDir, { recursive : true })

    const allLocalPackages = []
    const allProductionPackages = []

    for (const series of installSeries) {
      const { localPackages, productionPackages } = await install({
        devPaths    : app.ext.devPaths,
        packages    : series,
        projectPath : pluginPkgDir
      })

      allLocalPackages.push(...localPackages)
      allProductionPackages.push(...productionPackages)

      if (reloadFunc !== undefined) {
        const reload = reloadFunc({ app })
        if (reload.then) {
          await reload
        }
      }
    }

    if (allLocalPackages.length > 0) {
      msg += '<em>Installed<rst> <code>' + allLocalPackages.join('<rst>, <code>') + '<rst> local packages\n'
    }
    if (allProductionPackages.length > 0) {
      msg += '<em>Installed<rst> <code>' + allProductionPackages.join('<rst>, <code>') + '<rst> production packages\n'
    }
    if (alreadyInstalled.length > 0) {
      msg += '<code>' + alreadyInstalled.join('<rst>, <code>') + '<rst> <em>already installed<rst>.'
    }

    return msg
  }
  else {
    if (alreadyInstalled.length > 0) {
      msg += '<code>' + alreadyInstalled.join('<rst>, <code>') + '<rst> <em>already installed<rst>.'
    }
    else {
      msg = 'Nothing to install.'
    }

    return msg
  }
}

export { installPlugins }
