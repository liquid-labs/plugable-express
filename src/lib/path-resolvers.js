import { getRegistryBundles } from '../handlers/server/plugins/bundles/_lib/get-registry-bundles'

const handlerPluginName = {
  bitReString    : '((?:@|%40)[a-z0-9-~][a-z0-9-._~]*(?:[/]|%2f|%2F))?([a-z0-9-~][a-z0-9-._~]*)',
  optionsFetcher : ({ app }) => {
    return app.ext.handlerPlugins.map(({ npmName }) => npmName)
  }
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
