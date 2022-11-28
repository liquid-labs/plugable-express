import { emailEncodedOrNotReString } from '@liquid-labs/regex-repo'

const orgKey = {
  bitReString: '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher: ({ model }) => Object.keys(model.orgs)
}

const projectName = {
  bitReString: '[a-zA-Z0-9][a-zA-Z0-9-_]*',
  optionsFetcher: ({ model, orgKey }) => Object.keys(model.playground.orgs[orgKey].projects)
}

const staffKey = {
  bitReString: emailEncodedOrNotReString.slice(1, -1), // cut off the beginning and ending '/'
  optionsFetcher: ({ model, orgKey }) => model.orgs[orgKey].staff.list({ rawData : true }).map((s) => s.id )
}

const commonPathResolvers = { orgKey, projectName, staffKey }

export { commonPathResolvers }
