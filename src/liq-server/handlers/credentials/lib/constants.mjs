const CREDS_DB_CACHE_KEY = 'liq-credentials-db'

const GITHUB_SSH = 'gitHubSSH'
const GITHUB_API = 'gitHubAPI'

const CRED_SPECS = [
  {
    key         : GITHUB_SSH,
    name        : 'GitHub SSH key',
    description : 'Used to authenticate user for git operations such as clone, fetch, and push.',
    type        : 'ssh'
  },
  {
    key         : GITHUB_API,
    name        : 'GitHub API token',
    description : 'Used to authenticate REST/API actions.',
    type        : 'token'
  }
]
const CRED_TYPES = CRED_SPECS.map((cs) => cs.key)

const CREDS_PATH_STEM = 'credentials'

const credStatus = {
  NOT_SET: 'not set',
  SET_BUT_UNTESTED: 'set but untested',
  SET_AND_VERIFIED: 'set and ready',
  SET_BUT_INVALID: 'set invalid',
  SET_BUT_EXPIRED: 'set but expired'
}

export {
  CREDS_DB_CACHE_KEY,
  CRED_SPECS,
  CRED_TYPES,
  CREDS_PATH_STEM,
  credStatus,
  GITHUB_API,
  GITHUB_SSH
}
