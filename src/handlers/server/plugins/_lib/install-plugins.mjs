import * as fs from 'node:fs/promises'

import { install, getPackageOrgBasenameAndVersion } from '@liquid-labs/npm-toolkit'

import { determineInstallationOrder } from './installation-order'

/**
 * Installs plugins based on NPM package names
 * @param {Object} options - Installation options
 * @param {Object} options.app - Express app object
 * @param {Array} options.installedPlugins - Currently installed plugins
 * @param {boolean} options.noImplicitInstallation - Skip installation of implicit dependencies
 * @param {Array<string>} options.npmNames - NPM package names to install (with optional version specs)
 * @param {string} options.pluginPkgDir - Directory where plugins should be installed
 * @param {Function} options.reloadFunc - Function to call after installation to reload the app
 * @param {Object} options.reporter - Reporter for logging
 * @returns {Promise<{msg: string, data: Object}>} Installation result message and data
 */
const installPlugins = async({
  app,
  installedPlugins,
  noImplicitInstallation,
  npmNames,
  pluginPkgDir,
  reloadFunc,
  reporter
}) => {
  const alreadyInstalled = []
  const toInstall = []
  const originalToInstallSet = new Set() // Track originally requested packages

  for (const testPackage of npmNames) {
    const { name: testName } = await getPackageOrgBasenameAndVersion(testPackage)
    const matched = installedPlugins.some(({ npmName }) => npmName === testName)

    if (matched === true) {
      alreadyInstalled.push(testName)
    }
    else {
      toInstall.push(testPackage)
      originalToInstallSet.add(testName)
    }
  }

  let msg = ''
  const data = {
    installedPlugins : [],
    total            : 0,
    implied          : 0,
    local            : 0,
    production       : 0
  }

  if (toInstall.length > 0) {
    const installSeries = await determineInstallationOrder({
      installedPlugins,
      noImplicitInstallation,
      packageDir : pluginPkgDir,
      toInstall
    })

    await fs.mkdir(pluginPkgDir, { recursive : true })

    const allLocalPackages = []
    const allProductionPackages = []
    const processedPackages = new Map() // Track package details

    for (const series of installSeries) {
      const { localPackages, productionPackages } = await install({
        devPaths    : app.ext.devPaths,
        packages    : series,
        projectPath : pluginPkgDir
      })

      // Process each installed package
      for (const pkgSpec of series) {
        const { name, version } = await getPackageOrgBasenameAndVersion(pkgSpec)
        const isLocal = localPackages.includes(pkgSpec)
        const isProduction = productionPackages.includes(pkgSpec)
        const isImplied = !originalToInstallSet.has(name)

        const packageInfo = {
          name,
          version      : version || 'latest',
          fromLocal    : isLocal,
          fromRegistry : isProduction,
          isImplied
        }

        processedPackages.set(name, packageInfo)

        // Update counters
        if (isImplied) data.implied++
        if (isLocal) data.local++
        if (isProduction) data.production++
      }

      allLocalPackages.push(...localPackages)
      allProductionPackages.push(...productionPackages)

      if (reloadFunc !== undefined) {
        const reload = reloadFunc({ app })
        if (reload.then) {
          await reload
        }
      }
    }

    // Convert Map to array for data.installedPlugins
    data.installedPlugins = Array.from(processedPackages.values())
    data.total = data.installedPlugins.length

    if (allLocalPackages.length > 0) {
      msg += '<em>Installed<rst> <code>' + allLocalPackages.join('<rst>, <code>') + '<rst> local packages\n'
    }
    if (allProductionPackages.length > 0) {
      msg += '<em>Installed<rst> <code>' + allProductionPackages.join('<rst>, <code>') + '<rst> production packages\n'
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

export { installPlugins }
