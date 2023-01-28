import { commonOutputParams, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

import { CRED_SPECS } from './lib/constants'
import { CredDB } from './lib/credentials-db'

const method = 'put'
const path = [ 'credentials', 'list' ]
const parameters = [ ...commonOutputParams() ]

const mdFormatter = (creds, title) =>
  `# ${title}\n\n${creds.map((c) => `- ${c.name} (__${c.key}__/${c.status}):\n  ${c.description}`).join('\n')}\n`

const terminalFormatter = (creds, title) =>
  creds.map((c) => `- ${c.name} (<em>${c.key}<rst>/<bold>${c.status}<rst>):\n  ${c.description}`).join('\n')

const textFormatter = (creds, title) => terminalFormatter(creds, title).replaceAll(/<[a-z]+>/g, '')

const func = ({ app, cache, model, reporter }) =>  async (req, res) => {
  const credDB = new CredDB({ app, cache })

  formatOutput({
    basicTitle : 'Local Credentials',
    data       : credDB.list(),
    mdFormatter,
    terminalFormatter,
    textFormatter,
    reporter,
    req,
    res,
    allFields: CredDB.allFields,
    defaultFields: CredDB.defaultFields,
    ...req.vars
  })
}

export { func, parameters, path, method }
