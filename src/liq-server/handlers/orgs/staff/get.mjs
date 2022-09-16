import omit from 'lodash.omit'

import { getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'get'
// '%40' == '@''
const path = '/orgs/:orgKey/staff/:staffId(.+%40[^/]+)'
const parameters = [
  {
    name: 'fields',
    required: false,
    isMultivalue: true,
    description: "An array or comma-separated list of field names to include in the output data."
  },
  {
    name: 'ownRolesOnly',
    required: false,
    isBoolean: true,
    description: "If true, only includes directly assigned roles in the results (if any). If false (default), then all roles both direct and implied are included in the results."
  }
]
const validParams = parameters.map(p => p.name)
validParams.push('format', 'output')

/*const mdFormatter = (staff, title) =>
  `# ${title}\n\n${staff.map((s) => `* ${s.givenName}, ${s.surname} <${s.email}>`).join("\n")}\n`
  */

const func = ({ model, reporter }) => (req, res) => {
  const remainder = Object.keys(omit(req.query, validParams))
  if (remainder.length > 0) {
    throw new Error(`Unknown query parameters retrieving staff detail: ${remainder.join(', ')}.`)
  }
  
  const org = getOrgFromKey({ model, params: req.params, res })
  if (org === false) {
    return
  }
  const { staffId } = req.params
  const { fields=null, ownRolesOnly=false } = req.query
  
  const staffMember = org.staff.get(staffId, { ownRolesOnly })
  // TODO: pick fields
  
  res.json(staffMember)
}

export { func, parameters, path, method }
