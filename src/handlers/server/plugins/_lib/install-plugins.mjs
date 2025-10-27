import * as fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import * as https from 'node:https'
import * as os from 'node:os'
import * as path from 'node:path'

import { DepGraph } from 'dependency-graph'
import { rsort } from '@liquid-labs/semver-plus'
import { install, view, getPackageOrgBasenameAndVersion } from '@liquid-labs/npm-toolkit'
import yaml from 'js-yaml'

import { PluginError } from './error-utils'
import { readPackageDependencies } from './read-package-dependencies'

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
  const dependencyGraph = new DepGraph({ circular : false }) // Track dependencies for cycle detection

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
    reporter?.log(`To install: ${toInstall.join(', ')}`)

    await fs.mkdir(pluginPkgDir, { recursive : true })

    const processedPackages = new Map() // Track package details

    const { localPackages, productionPackages } = await installAll({
      devPaths    : app.ext.devPaths,
      installedPlugins,
      noImplicitInstallation,
      packages    : toInstall,
      projectPath : pluginPkgDir,
      reporter,
      dependencyGraph
    })

    // Process each installed package
    for (const pkgSpec of [...localPackages, ...productionPackages]) {
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

    if (reloadFunc !== undefined) {
      const reload = reloadFunc({ app })
      if (reload.then) {
        await reload
      }
    }

    // Convert Map to array for data.installedPlugins
    data.installedPlugins = Array.from(processedPackages.values())
    data.total = data.installedPlugins.length

    if (localPackages.length > 0) {
      msg += '<em>Installed<rst> <code>' + localPackages.join('<rst>, <code>') + '<rst> local packages\n'
    }
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

/**
 * Attempts to fetch plugable-express.yaml from GitHub
 * @param {Object} packageData - Package metadata from npm view
 * @param {string} packageName - Package name
 * @param {string} version - Requested version or version range
 * @param {Object} reporter - Reporter for logging
 * @returns {Promise<Array<string>|null>} Array of dependencies or null if not available from GitHub
 */
const getPlugableExpressYamlFromGitHub = async(packageData, packageName, version, reporter) => {
  let urlBase = null
  try {
    // Check if repository exists and points to GitHub
    if (!packageData.repository || !packageData.repository.url) {
      return [null, null]
    }

    const repoUrl = packageData.repository.url
    const githubMatch = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)

    if (!githubMatch) {
      return [null, null]
    }

    const [, owner, repo] = githubMatch

    // Determine the version tag to use
    // If version is specified and packageData.version matches, use that
    // Otherwise, fetch all versions and find the best match
    const versionTag = version || packageData.version

    // Construct the raw GitHub URL
    urlBase = `https://raw.githubusercontent.com/${owner}/${repo}/v${versionTag}`
    const rawUrl = `${urlBase}/plugable-express.yaml`

    reporter?.log(`Attempting to fetch plugable-express.yaml from GitHub:\n\t${rawUrl}`)

    // Fetch the YAML file
    const yamlContent = await new Promise((resolve, reject) => {
      https.get(rawUrl, (response) => {
        if (response.statusCode === 404) {
          // File doesn't exist, return null to trigger fallback
          resolve(null)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch plugable-express.yaml: ${response.statusCode}`))
          return
        }

        let data = ''
        response.on('data', (chunk) => { data += chunk })
        response.on('end', () => resolve(data))
        response.on('error', reject)
      }).on('error', reject)
    })

    if (!yamlContent) {
      reporter?.log(`No plugable-express.yaml found for ${packageName}`)
      return [null, urlBase]
    }
    else {
      reporter?.log(`Found plugable-express.yaml for ${packageName}`)
    }

    // Parse YAML and extract dependencies
    const config = yaml.load(yamlContent)
    const dependencies = []

    if (config && config.dependencies) {
      for (const dep of config.dependencies) {
        if (typeof dep === 'string') {
          dependencies.push(dep)
        }
        else if (dep.npmPackage) {
          const pkgSpec = dep.version ? `${dep.npmPackage}@${dep.version}` : dep.npmPackage
          dependencies.push(pkgSpec)
        }
      }
    }

    return [dependencies, urlBase]
  }
  catch (error) {
    // Log error but don't fail - fall back to tarball extraction
    reporter?.log(`Failed to fetch from GitHub: ${error.message}`)
    return [null, urlBase]
  }
}

/**
 * Fetches package dependencies from both package.json and plugable-express.yaml
 * Uses GitHub raw content API when possible, falls back to tarball extraction
 * @param {string} pkgSpec - Package specification (name with optional version)
 * @param {Object} reporter - Reporter for logging
 * @returns {Promise<{npmDependencies: Array<string>, pluginDependencies: Array<string>}>} Object with separate npm and plugin dependencies
 */
const fetchPackageDependencies = async(pkgSpec, reporter) => {
  const { name, version } = await getPackageOrgBasenameAndVersion(pkgSpec)

  // Use view() to get package metadata without installing
  const viewResult = await view({ packageName : name, version })

  if (!viewResult) {
    reporter?.log(`No package data found for ${pkgSpec}`)
    return { npmDependencies : [], pluginDependencies : [] }
  }

  // If view() returns an array (version range), select the latest version
  let packageData
  if (Array.isArray(viewResult)) {
    // Extract versions and sort in descending order to get the latest
    const versions = viewResult.map(pkg => pkg.version)
    const sortedVersions = rsort(versions)
    const latestVersion = sortedVersions[0]

    // Find the package data for the latest version
    packageData = viewResult.find(pkg => pkg.version === latestVersion)

    reporter?.log(`Resolved ${pkgSpec} to version ${latestVersion}`)
  }
  else {
    packageData = viewResult
  }

  if (!packageData) {
    reporter?.log(`No package data found after version resolution for ${pkgSpec}`)
    return { npmDependencies : [], pluginDependencies : [] }
  }

  const npmDependencies = []
  const pluginDependencies = []

  // Extract npm package.json dependencies
  if (packageData.dependencies) {
    for (const [depName, depVersion] of Object.entries(packageData.dependencies)) {
      // Convert to package spec format (name@version or just name)
      npmDependencies.push(depVersion ? `${depName}@${depVersion}` : depName)
    }
  }

  // Try to get plugable-express.yaml dependencies from GitHub first
  let [yamlDependencies, urlBase] = await getPlugableExpressYamlFromGitHub(packageData, name, version, reporter)

  if (yamlDependencies === null && urlBase !== null) {
    // then we want to check if we can retrieve package.json from github; if so, then there is no
    // 'plugable-express.yaml' file to use, so we return empty plugin dependencies
    const packageJsonUrl = `${urlBase}/package.json`
    reporter?.log(`No plugable-express.yaml found for ${name}, checking for package.json on GitHub:\n\t${packageJsonUrl}`)
    const foundPackageJson = await new Promise((resolve, reject) => {
      https.get(packageJsonUrl, (response) => {
        if (response.statusCode === 404) {
          // File doesn't exist, return null to trigger fallback
          resolve(false)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch package.json: ${response.statusCode}`))
          return
        }

        // Must consume the response data for 'end' event to fire
        // We don't need the data, just need to verify the file exists
        response.resume() // Consume and discard the data
        response.on('end', () => {
          reporter?.log(`Found package.json for ${name}`)
          resolve(true)
        })
        response.on('error', reject)
      }).on('error', reject)
    })

    if (foundPackageJson === true) {
      reporter?.log(`Found package.json for ${name}; confirms no plugable-express.yaml file is expected`)
      return { npmDependencies, pluginDependencies : [] }
    }
    else {
      reporter?.log(`No package.json found for ${name}; falling back to tarball extraction`)
    }
  }

  // If GitHub method failed, fall back to tarball extraction
  if (yamlDependencies === null && packageData.dist && packageData.dist.tarball) {
    reporter?.log(`Falling back to tarball extraction for ${name}`)

    const tarballUrl = packageData.dist.tarball
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'plugable-express-'))

    try {
      // Download tarball to temp file
      const tarballPath = path.join(tempDir, 'package.tgz')
      await new Promise((resolve, reject) => {
        https.get(tarballUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download tarball: ${response.statusCode}`))
            return
          }

          const fileStream = createWriteStream(tarballPath)
          response.pipe(fileStream)
          fileStream.on('finish', () => {
            fileStream.close()
            resolve()
          })
          fileStream.on('error', reject)
        }).on('error', reject)
      })

      // Extract tarball (using dynamic import to avoid requiring tar if not needed)
      const extractDir = path.join(tempDir, 'extracted')
      await fs.mkdir(extractDir, { recursive : true })

      const { x: extractTar } = await import('tar')
      await extractTar({
        file  : tarballPath,
        cwd   : extractDir,
        strip : 1 // Strip the 'package' directory from tarball
      })

      // Read plugable-express.yaml dependencies
      yamlDependencies = await readPackageDependencies({
        packageName : name,
        packageDir  : extractDir,
        reporter
      })
    }
    finally {
      // Clean up temp directory
      await fs.rm(tempDir, { recursive : true, force : true })
    }
  }

  // Set plugin dependencies from yaml if found
  if (yamlDependencies && yamlDependencies.length > 0) {
    pluginDependencies.push(...yamlDependencies)
  }

  return { npmDependencies, pluginDependencies }
}

/**
 * Discovers all dependencies recursively by viewing package metadata and building dependency graph
 * Validates for cycles before any packages are installed
 * Only installs standardPackages + plugable-express.yaml dependencies (not npm dependencies)
 * @param {Object} options - Discovery options
 * @param {Array} options.installedPlugins - Currently installed plugins
 * @param {boolean} options.noImplicitInstallation - Skip implicit dependency discovery
 * @param {Array} options.packages - Initial packages to discover dependencies for (standardPackages)
 * @param {Object} options.reporter - Reporter for logging
 * @param {DepGraph} options.dependencyGraph - Dependency graph for cycle detection
 * @returns {Promise<Object>} Object with packagesToInstall
 */
const discoverAllDependencies = async({ installedPlugins, noImplicitInstallation, packages, reporter, dependencyGraph }) => {
  const packagesToInstall = new Set() // Only plugin deps - what we actually install
  const toProcess = [...packages] // Queue of packages to process
  const processed = new Set() // Packages we've already processed

  while (toProcess.length > 0) {
    const pkgSpec = toProcess.shift()
    const { name } = await getPackageOrgBasenameAndVersion(pkgSpec)

    if (processed.has(name)) continue
    processed.add(name)

    // Skip if already installed in the system
    if (installedPlugins.some(({ npmName }) => npmName === name)) {
      continue
    }

    packagesToInstall.add(pkgSpec)

    // Skip dependency discovery if noImplicitInstallation is set
    if (noImplicitInstallation) {
      continue
    }

    // Fetch dependencies without installing
    const { npmDependencies, pluginDependencies } = await fetchPackageDependencies(pkgSpec, reporter)

    // Add package node to dependency graph
    if (!dependencyGraph.hasNode(name)) {
      dependencyGraph.addNode(name)
    }

    // Add ALL dependencies (npm + plugin) to graph for cycle validation
    const allDependencies = [...npmDependencies, ...pluginDependencies]

    for (const dep of allDependencies) {
      const { name: depName } = await getPackageOrgBasenameAndVersion(dep)

      // Skip if already installed in the system
      if (installedPlugins.some(({ npmName }) => npmName === depName)) {
        continue
      }

      // Add dependency node to graph
      if (!dependencyGraph.hasNode(depName)) {
        dependencyGraph.addNode(depName)
      }

      // Add the dependency edge and check for cycles BEFORE installing the dependency
      try {
        dependencyGraph.addDependency(name, depName)
        dependencyGraph.overallOrder() // Validates no cycles exist
      }
      catch (error) {
        if (error.message.includes('Dependency Cycle Found')) {
          const cycleMatch = error.message.match(/Dependency Cycle Found: (.+)/)
          const cycle = cycleMatch ? cycleMatch[1].split(' -> ') : [name, depName]
          throw PluginError.dependency(
            `Circular dependency detected: ${cycle.join(' → ')}`,
            cycle,
            depName
          )
        }
        throw error
      }
    }

    // Only queue PLUGIN dependencies for recursive installation (not npm dependencies)
    for (const dep of pluginDependencies) {
      const { name: depName } = await getPackageOrgBasenameAndVersion(dep)
      if (!processed.has(depName)) {
        toProcess.push(dep)
      }
    }
  }

  return { packagesToInstall }
}

const installAll = async({ devPaths, installedPlugins, noImplicitInstallation, packages, projectPath, reporter, dependencyGraph }) => {
  // Discover all dependencies and validate dependency graph
  // This uses view() to read package metadata without installing, checking for cycles during discovery
  const { packagesToInstall } = await discoverAllDependencies({
    installedPlugins,
    noImplicitInstallation,
    packages,
    reporter,
    dependencyGraph
  })

  checkMaxPackages(packagesToInstall.size)

  // Install all packages with devPaths support (local packages are properly linked)
  return await install({
    devPaths,
    packages : Array.from(packagesToInstall),
    projectPath
  })
}
export { installPlugins }
