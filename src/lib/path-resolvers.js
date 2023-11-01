import { getRegistryBundles } from '../handlers/server/plugins/bundles/_lib/get-registry-bundles'

const handlerPluginName = {
  bitReString    : '[a-z][a-z0-9-]*',
  optionsFetcher : ({ app }) => app.ext.handlerPlugins.map(({ name }) => name)
}

const newOrgKey = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : ({ currToken, newOrgKey }) => newOrgKey ? [newOrgKey] : []
}

const pluginBundle = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : async({ app, cache }) => {
    const bundles = await getRegistryBundles({ app, cache })
    return bundles.map(({ name }) => name)
  }
}

const commonPathResolvers = { handlerPluginName, newOrgKey, pluginBundle }

export { commonPathResolvers }
