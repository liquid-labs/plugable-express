import { determineRegistryData, selectMatchingSeries } from '@liquid-labs/liq-plugins-lib'

const getRegistryBundles = async({ app, cache, update = false }) => {
  const registries = app.ext.serverSettings.registries
  const registriesData = await determineRegistryData({ cache, registries, update })

  const setOfSeries = selectMatchingSeries({ hostVersion : app.ext.serverVersion, registryData : registriesData })

  const bundles = setOfSeries.reduce((acc, { bundles }) => { acc.push(...bundles); return acc }, [])

  return bundles
}

export { getRegistryBundles }
