import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'
import { CredentialsDB } from '@liquid-labs/liq-credentials-db'

const method = 'get'
const path = ['credentials', 'list']
const parameters = [
  {
    name        : 'verify',
    isBoolean   : true,
    description : '(Re-)verifies credentials.'
  },
  ...commonOutputParams()
]

const mdFormatter = (creds, title) =>
  `# ${title}\n\n${creds.map((c) => `- ${c.name} (__${c.key}__/${c.status}):\n  ${c.description}`).join('\n')}\n`

const terminalFormatter = (creds, title) =>
  creds.map((c) => `- ${c.name} (<em>${c.key}<rst>/<bold>${c.status}<rst>):\n  ${c.description}`).join('\n')

const textFormatter = (creds, title) => terminalFormatter(creds, title).replaceAll(/<[a-z]+>/g, '')

const func = ({ app, cache, model, reporter }) => async(req, res) => {
  const { verify } = req.vars

  const credDB = new CredentialsDB({ app, cache })

  credDB.verifyCreds({ reVerify : verify })

  formatOutput({
    basicTitle    : 'Local Credentials',
    data          : credDB.list(),
    mdFormatter,
    terminalFormatter,
    textFormatter,
    reporter,
    req,
    res,
    allFields     : CredentialsDB.allFields,
    defaultFields : CredentialsDB.defaultFields,
    ...req.vars
  })
}

export { func, parameters, path, method }
