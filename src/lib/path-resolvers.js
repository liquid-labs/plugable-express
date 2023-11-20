import { getServerBundles } from '../handlers/server/plugins/bundles/_lib/get-server-bundles'

const pluginBundle = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : async({ app, cache }) => {
    const bundles = await getServerBundles({ app, cache })
    return bundles.map(({ name }) => name)
  }
}

const serverPluginName = {
  bitReString    : '((?:@|%40)[a-z0-9-~][a-z0-9-._~]*(?:[/]|%2f|%2F))?([a-z0-9-~][a-z0-9-._~]*)',
  optionsFetcher : ({ app }) => {
    return app.ext.handlerPlugins.map(({ npmName }) => npmName)
  }
}

const commonPathResolvers = { pluginBundle, serverPluginName }

export { commonPathResolvers }
