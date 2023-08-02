import { emailEncodedOrNotReString } from '@liquid-labs/regex-repo'

const handlerPluginName = {
  bitReString    : '[a-z][a-z0-9-]*',
  optionsFetcher : ({ app }) => app.liq.handlerPlugins.map(({ name }) => name)
}

const localProjectName = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-_]*',
  optionsFetcher : ({ currToken = '', model, orgKey }) => {
    const orgKeyLength = orgKey.length + 1
    const projectNames = Object.keys(model.playground.projects)
      .filter((p) => p.startsWith(orgKey + '/' + currToken))
      .map((p) => p.slice(orgKeyLength))
    return projectNames
  }
}

const newOrgKey = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : ({ currToken, newOrgKey }) => newOrgKey ? [newOrgKey] : []
}

const orgKey = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : ({ model }) => Object.keys(model.orgs)
}

const staffKey = {
  bitReString    : emailEncodedOrNotReString.slice(1, -1), // cut off the beginning and ending '/'
  optionsFetcher : ({ model, orgKey }) => model.orgs[orgKey].staff.list({ rawData : true }).map((s) => s.id)
}

const threadId = {
  bitReString    : '[0-9]+',
  optionsFetcher : ({ app }) => app.tasks.list()
}

const commonPathResolvers = { localProjectName, newOrgKey, handlerPluginName, orgKey, staffKey, threadId }

export { commonPathResolvers }
