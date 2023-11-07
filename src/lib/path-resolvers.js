import { npmPackageNameRE } from '@liquid-labs/regex-repo'

import { getRegistryBundles } from '../handlers/server/plugins/bundles/_lib/get-registry-bundles'

const handlerPluginName = {
  bitReString    : npmPackageNameRE.toString().slice(1, -1),
  optionsFetcher : ({ app }) => {
    console.log('hey') // DEBUG
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
