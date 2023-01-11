import { emailEncodedOrNotReString } from '@liquid-labs/regex-repo'

const localOrgKey = {
  bitReString: '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher: ({ model }) => Object.keys(model.orgs)
}

const localProjectName = {
  bitReString: '[a-zA-Z0-9][a-zA-Z0-9-_]*',
  optionsFetcher: ({ model, localOrgKey }) => Object.keys(model.playground.orgs[localOrgKey].projects)
}

// TODO: really, anynthing looking at the local model should use local org key; a non-local org key could be anything!
const orgKey = localOrgKey // TODO: really, everything should be localOrgKey

const staffKey = {
  bitReString: emailEncodedOrNotReString.slice(1, -1), // cut off the beginning and ending '/'
  optionsFetcher: ({ model, orgKey }) => model.orgs[orgKey].staff.list({ rawData : true }).map((s) => s.id )
}

const commonPathResolvers = { orgKey, localOrgKey, localProjectName, staffKey }

export { commonPathResolvers }
