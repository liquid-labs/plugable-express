import omit from 'lodash.omit'

import { commonOutputConfig, commonOutputParams, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'get'
const path = '/orgs(/list)?'
const parameters = [ ...commonOutputParams() ]
const validParams = parameters.map(p => p.name)

const mdFormatter = (orgs, title) =>
  `# ${title}\n\n${orgs.map((o) => `* ${o.name}`).join("\n")}\n`

const func = ({ model, reporter }) => (req, res) => {
  const remainder = Object.keys(omit(req.query, validParams))
  if (remainder.length > 0) {
    throw new Error(`Unknown query parameters listing staff: ${remainder.join(', ')}.`)
  }
  
  let orgs = Object.values(model.orgs)
  const defaultFields = [ 'key', 'commonName', 'legalName' ]
  const allFields = [ ...defaultFields ]
    
  formatOutput({
    basicTitle : 'Org Report',
    data : orgs,
    mdFormatter,
    reporter,
    req,
    res,
    ...commonOutputConfig({
      allFields,
      defaultFields,
    }, req.query)
  })
}

export { func, parameters, path, method }
