import pick from 'lodash.pick'

import { commonOutputParams, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const help = {
  name: "Staff detail",
  summary: "Retrieves details of the specified staff member.",
  description: "<danger>Partial implementation.<rst> By default, this method retrieves the full detail record by default, including all implied roles. Use <code>ownRolesOnly<rst> to include only directly assigned roles."
}


const method = 'get'
// '%40' == '@''
const path = [ 'orgs', ':orgKey', 'staff', ':staffKey' ]
const parameters = [
  {
    name: 'ownRolesOnly',
    required: false,
    isBoolean: true,
    description: "If true, only includes directly assigned roles in the results (if any). If false (default), then all roles both direct and implied are included in the results."
  },
  ...commonOutputParams()
]

/* const mdFormatter = (staff, title) =>
  `# ${title}\n\n${staff.map((s) => `* ${s.givenName}, ${s.surname} <${s.email}>`).join("\n")}\n`
  */

const func = ({ model, reporter }) => (req, res) => {
  const org = getOrgFromKey({ model, params: req.vars, res })
  if (org === false) {
    return
  }
  
  const { staffKey, fields, ownRolesOnly=false } = req.vars
  
  const staffMember = org.staff.get(staffKey, { ownRolesOnly, rawData: true })
  if (fields !== undefined && Array.isArray(fields) && fields.length > 0) {
    res.json(pick(staffMember, fields))
  }
  else {
    res.json(staffMember)
  }
}

export { func, help, parameters, path, method }
