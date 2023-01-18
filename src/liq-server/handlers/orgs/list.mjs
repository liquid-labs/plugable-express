import omit from 'lodash.omit'

import { commonOutputParams, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'get'
// const path = new RegExp('/orgs(?:/list)?[/#?]?$')
const path = [ 'orgs', 'list?' ]
const parameters = commonOutputParams // option func setup on 'fields' below

const defaultFields = [ 'key', 'commonName', 'legalName' ]
const allFields = [ ...defaultFields ]
parameters.find((o) => o.name === 'fields').optionsFunc = () => allFields

const mdFormatter = (orgs, title) => `# ${title}\n\n${orgs.map((o) => `* ${o.name}`).join("\n")}\n`

const terminalFormatter = (orgs) => orgs.map((o) => `${o.commonName} (<em>${o.key}<rst>)`).join('\n')

const textFormatter = (orgs) => orgs.map((o) => `${o.commonName} (${o.key})`).join('\n')

const func = ({ model, reporter }) => (req, res) => {
  let orgs = Object.values(model.orgs)
    
  formatOutput({
    basicTitle : 'Org Report',
    data : orgs,
    allFields,
    defaultFields,
    mdFormatter,
    terminalFormatter,
    textFormatter,
    reporter,
    req,
    res,
    ...req.vars
  })
}

export { func, parameters, path, method }
