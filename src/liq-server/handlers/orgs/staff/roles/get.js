import * as fs from 'fs'
import * as fsPath from 'path'

import kebabCase from 'lodash.kebabcase'

import { getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

import { formatOutput } from '../../../_lib'

const method = 'get'
const path = '/orgs/:orgKey/staff/roles' // TODO: shouldn't this actually end end a '/'?
const parameters = []

const mdFormatter = (roles, title) => {
  const markdownBuf = [`# ${title}\n`]
  for (const { name, summary, superRole, implies = [] } of roles) {
    markdownBuf.push(
      `## ${name}\n`,
      "### Summary\n",
      summary+"\n"
    )
    if (superRole || implies.length > 0) {
      markdownBuf.push("### Implies\n")
      if (superRole && implies.findIndex((i) => i.name === superRole.name) === -1) {
        implies.unshift({ name: superRole.name, mngrProtocol: 'self' })
      }
      for (const { name: impliedName } of implies) {
        markdownBuf.push(`- [${impliedName}](#${kebabCase(impliedName)})`)
      }
      markdownBuf.push("\n")
    }
  }
  return markdownBuf.join("\n")
}

const func = ({ cache, model, reporter }) => (req, res, next) => {
  const org = getOrgFromKey({ model, params: req.params, res })
  if (org === false) {
    return
  }
  
  formatOutput({
    basicTitle : 'Roles Report',
    data : org.roles.list(),
    mdFormatter,
    reporter,
    req,
    res
  })
}

export { func, method, parameters, path }
