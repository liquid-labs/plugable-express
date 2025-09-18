import * as semver from 'semver'

/**
 * Selects matching series from registry data based on host version
 * @param {Object} options - Selection options
 * @param {string} options.hostVersion - Version of the host application
 * @param {Object} options.registryData - Registry data loaded from registries
 * @returns {Array} Array of matching series with source information
 */
const selectMatchingSeries = ({ hostVersion, registryData }) => {
  return Object.entries(registryData).reduce((acc, entry) => {
    const [source, rd] = entry
    const { series } = rd

    const matchingSeries = series.find(({ versions }) =>
      semver.satisfies(hostVersion, versions, { includePrerelease : true }))

    if (matchingSeries !== undefined) {
      matchingSeries.source = source
      acc.push(matchingSeries)
    }

    return acc
  }, [])
}

/**
 * Selects matching plugins from registry data based on host version and plugin type
 * @param {Object} options - Selection options
 * @param {string} options.hostVersion - Version of the host application
 * @param {Array} options.installedPlugins - Currently installed plugins
 * @param {string} options.pluginType - Type of plugin (e.g., 'server')
 * @param {Object} options.registryData - Registry data loaded from registries
 * @returns {Array} Array of matching plugin definitions
 */
const selectMatchingPlugins = ({ hostVersion, installedPlugins, pluginType, registryData }) => {
  const series = selectMatchingSeries({ hostVersion, registryData })

  return series.reduce((acc, seriesData) => {
    const { source } = seriesData
    const plugins = seriesData.plugins?.[pluginType] || []

    for (const pluginData of plugins) {
      if (installedPlugins !== undefined) {
        pluginData.installed = installedPlugins.some((p) => p.npmName === pluginData.npmName)
      }
      pluginData.source = source
      acc.push(pluginData)
    }
    return acc
  }, [])
}

export { selectMatchingSeries, selectMatchingPlugins }
