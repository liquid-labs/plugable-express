const handlerPluginName = {
  bitReString    : '[a-z][a-z0-9-]*',
  optionsFetcher : ({ app }) => app.ext.handlerPlugins.map(({ name }) => name)
}

const newOrgKey = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : ({ currToken, newOrgKey }) => newOrgKey ? [newOrgKey] : []
}

const orgKey = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : ({ model }) => Object.keys(model.orgs)
}

const threadId = {
  bitReString    : '[0-9]+',
  optionsFetcher : ({ app }) => app.tasks.list()
}

const commonPathResolvers = { newOrgKey, handlerPluginName, orgKey, threadId }

export { commonPathResolvers }
