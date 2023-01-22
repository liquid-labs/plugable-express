import * as credDb from './lib/credentials-db'
import { CREDS_DB_CACHE_KEY } from './lib/constants'

const method = 'put'
const path = ['credentials', ':credential', 'import']
const parameters = [
  {
    name        : 'replace',
    isBoolean   : true,
    description : 'By default, trying to import a credential of the same type results in an error, unless `replace` is true.'
  },
  {
    name          : 'path',
    required      : true,
    isSingleValue : true,
    descirption   : 'Local path to the credential file.'
  },
  {
    name        : 'leaveInPlace',
    isBoolean   : true,
    excludes    : ['moveToStorage'],
    description : 'Leaves the credentials file in place (the default). See [`moveToStorage`](#param-moveToStorage).'
  },
  {
    name        : 'moveToStorage',
    isBoolean   : true,
    excludes    : ['leaveInPlace'],
    descirption : 'Moves the credential file from [`path`](#param-path) to centralized storage under the `$LIQ_HOME` (typically `$HOME/.liq`).'
  }
]

const CRED_SPECS = [
  {
    key         : 'gitHubSSH',
    name        : 'GitHub SSH',
    description : 'Used to authenticate user for git operations such as clone, fetch, and push.'
  }
]
const CRED_TYPES = CRED_SPECS.map((cs) => cs.key)

const func = ({ app, cache, model, reporter }) => {
  app.commonPathResolvers.credential = {
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
    },
    bitReString : '(?:' + CRED_TYPES.join('|') + ')'
  }

  return (req, res) => {
    const liqHome = app.liqHome()
    const dbPath = `${liqHome}/credentials.json`

    // TODO: use this var
    // eslint-disable-next-line no-unused-vars
    const credentialsDb = credDb.loadDb({ cache, cacheKey : CREDS_DB_CACHE_KEY, path : dbPath })

    res.status(505).type('text/plain').send('Not implemented.')
  }
}

export { func, parameters, path, method }
