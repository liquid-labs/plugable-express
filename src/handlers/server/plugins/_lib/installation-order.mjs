import { DepGraph } from 'dependency-graph'
import { getPackageOrgBasenameAndVersion } from '@liquid-labs/npm-toolkit'

/**
 * Determines the installation order for packages based on dependencies
 * @param {Object} options - Installation order options
 * @param {Array} options.installedPlugins - Currently installed plugins
 * @param {Array} options.pluginSeries - Plugin series data containing dependency information
 * @param {Array} options.toInstall - Package names to install
 * @returns {Promise<Array>} Array of installation series (arrays of packages to install in each batch)
 */
const determineInstallationOrder = async({ installedPlugins, pluginSeries, toInstall }) => {
  const pluginEntries = pluginSeries.reduce((acc, series) => {
    const { plugins } = series
    for (const pluginList of Object.values(plugins)) {
      acc.push(...pluginList)
    }
    return acc
  }, [])

  const graph = new DepGraph()
  const processed = new Set()
  const toProcess = [...toInstall]

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
    const { dependencies = [] } = pluginEntries.find((e) => e.npmName === name) || {}

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
