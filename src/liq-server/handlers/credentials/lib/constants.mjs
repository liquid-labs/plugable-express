const CREDS_DB_CACHE_KEY = 'liq-credentials-db'

const CRED_SPECS = [
  {
    key         : 'gitHubSSH',
    name        : 'GitHub SSH key',
    description : 'Used to authenticate user for git operations such as clone, fetch, and push.',
    type        : 'ssh'
  },
  {
    key         : 'gitHubAPI',
    name        : 'GitHub API token',
    description : 'Used to authenticate REST/API actions.',
    type        : 'token'
  }
]
const CRED_TYPES = CRED_SPECS.map((cs) => cs.key)

const CREDS_PATH_STEM = 'credentials'

const credStatus = {
  NOT_SET: 'not set',
  SET_AND_UNTESTED: 'set and untested',
  SET_AND_READY: 'set and ready',
  INVALID: 'invalid',
  EXPIRED: 'expired'
}

export {
  CREDS_DB_CACHE_KEY,
  CRED_SPECS,
  CRED_TYPES,
  CREDS_PATH_STEM,
  credStatus
}
