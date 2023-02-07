import { emailEncodedOrNotReString } from '@liquid-labs/regex-repo'

import { CRED_TYPES } from '../handlers/credentials/lib/constants'

const credential = {
  bitReString    : '(?:' + CRED_TYPES.join('|') + ')',
  optionsFetcher : ({ currToken = '' }) => {
    const results = []
    if (currToken) {
      for (const credName of CRED_TYPES) {
        if (credName.startsWith(currToken)) {
          results.push(credName)
        }
      }
    }
    else {
      results.push(...CRED_TYPES)
    }

    return results
  }
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

const orgKey = {
  bitReString    : '[a-zA-Z0-9][a-zA-Z0-9-]*',
  optionsFetcher : ({ model }) => Object.keys(model.orgs)
}

const staffKey = {
  bitReString    : emailEncodedOrNotReString.slice(1, -1), // cut off the beginning and ending '/'
  optionsFetcher : ({ model, orgKey }) => model.orgs[orgKey].staff.list({ rawData : true }).map((s) => s.id)
}

const commonPathResolvers = { credential, localProjectName, orgKey, staffKey }

export { commonPathResolvers }
