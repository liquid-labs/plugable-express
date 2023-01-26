import { emailEncodedOrNotReString } from '@liquid-labs/regex-repo'

const orgKey = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : ({ model }) => Object.keys(model.orgs)
}

const localProjectName = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-_]*',
  optionsFetcher : ({ model, orgKey }) => {
    const orgKeyLength = orgKey.length + 1
    const projectNames = Object.keys(model.playground.projects)
      .filter((p) => p.startsWith(orgKey + '/'))
      .map((p) => p.slice(orgKeyLength))
    return projectNames
  }
}

const staffKey = {
  bitReString    : emailEncodedOrNotReString.slice(1, -1), // cut off the beginning and ending '/'
  optionsFetcher : ({ model, orgKey }) => model.orgs[orgKey].staff.list({ rawData : true }).map((s) => s.id)
}

const commonPathResolvers = { orgKey, orgKey, localProjectName, staffKey }

export { commonPathResolvers }
