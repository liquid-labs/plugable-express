import { DepGraph } from 'dependency-graph'
import { getPackageOrgBasenameAndVersion } from '@liquid-labs/npm-toolkit'
import createError from 'http-errors'
import fs from 'fs/promises'
import yaml from 'yaml'
import path from 'path'

/**
 * Determines the installation order for packages based on dependencies from plugable-express.yaml files
 * @param {Object} options - Installation order options
 * @param {Array} options.installedPlugins - Currently installed plugins
 * @param {string} options.packageDir - Directory containing package installations
 * @param {Array} options.toInstall - Package names to install
 * @returns {Promise<Array>} Array of installation series (arrays of packages to install in each batch)
 */
const determineInstallationOrder = async({ installedPlugins, packageDir, toInstall }) => {
  const graph = new DepGraph()
  const processed = new Set()
  const toProcess = [...toInstall]

  /**
   * Reads dependencies from a package's plugable-express.yaml file
   * @param {string} packageName - Package name
   * @returns {Promise<Array>} Array of dependency package names
   */
  const readPackageDependencies = async(packageName) => {
    const yamlPath = path.resolve(packageDir, packageName, 'plugable-express.yaml')

    let yamlContent
    try {
      yamlContent = await fs.readFile(yamlPath, 'utf8')
    }
    catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, no dependencies
        return []
      }
      else if (error.code === 'EACCES') {
        throw createError(403, error, {
          message : `Cannot access 'plugable-express.yaml'. ERR: ${error.message}`
        })
      }
      else {
        // Re-throw other unexpected file system errors
        throw error
      }
    }

    // Parse YAML content
    try {
      const config = yaml.parse(yamlContent)
      return config.dependencies || []
    }
    catch (error) {
      throw createError(500, error, {
        message : `Error parsing 'plugable-express.yaml'; possibly invalid yaml. ERR: ${error.message}`,
        expose  : true
      })
    }
  }

  // Process dependencies iteratively to avoid infinite loops
  while (toProcess.length > 0) {
    const packageToInstall = toProcess.shift()

    if (processed.has(packageToInstall)) {
      continue
    }
    processed.add(packageToInstall)

    if (!graph.hasNode(packageToInstall)) {
      graph.addNode(packageToInstall)
    }

    const { name } = await getPackageOrgBasenameAndVersion(packageToInstall)
    const dependencies = await readPackageDependencies(name)

    for (const dependency of dependencies) {
      if (installedPlugins.includes(dependency) || processed.has(dependency)) {
        continue
      }

      if (!graph.hasNode(dependency)) {
        graph.addNode(dependency)
        toProcess.push(dependency)
      }

      graph.addDependency(packageToInstall, dependency)
    }
  }

  const installSeries = []
  while (graph.size() > 0) {
    const series = graph.overallOrder(true)
    installSeries.push(series)

    for (const pkg of series) {
      graph.removeNode(pkg)
    }
  }

  return installSeries
}

export { determineInstallationOrder }
