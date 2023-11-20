import { determineRegistryData, selectMatchingSeries } from '@liquid-labs/liq-plugins-lib'

const getServerBundles = async({ app, cache, update = false }) => {
  const registries = app.ext.serverSettings.registries
  const registriesData = await determineRegistryData({ cache, registries, update })

  const setOfSeries = selectMatchingSeries({ hostVersion : app.ext.serverVersion, registryData : registriesData })

  const serverBundles = setOfSeries.reduce((acc, { bundles }) => { acc.push(...bundles.server); return acc }, [])

  return serverBundles
}

export { getServerBundles }
