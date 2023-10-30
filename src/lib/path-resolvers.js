const handlerPluginName = {
  bitReString    : '[a-z][a-z0-9-]*',
  optionsFetcher : ({ app }) => app.ext.handlerPlugins.map(({ name }) => name)
}

const newOrgKey = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : ({ currToken, newOrgKey }) => newOrgKey ? [newOrgKey] : []
}

const commonPathResolvers = { newOrgKey, handlerPluginName }

export { commonPathResolvers }
