import omit from 'lodash.omit'

import { commonOutputConfig, commonOutputParams, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'get'
const path = '/orgs/:orgKey/staff(/list)?'
const parameters = [
  {
    name: 'all',
    required: false,
    isBoolean: true,
    description: "Include all staff, including 'logical' staff members."
  },
    {
    name: 'withRole',
    required: false,
    isMultivalue: true,
    description: "An array or comma separated list of role names. The resultis must have at least one of the indicated roles."
  },
  ...commonOutputParams()
]
const validParams = parameters.map(p => p.name)

const mdFormatter = (staff, title) =>
  `# ${title}\n\n${staff.map((s) => `* ${s.givenName}, ${s.surname} <${s.email}>`).join("\n")}\n`

const func = ({ model, reporter }) => (req, res) => {
  const remainder = Object.keys(omit(req.query, validParams))
  if (remainder.length > 0) {
    throw new Error(`Unknown query parameters listing staff: ${remainder.join(', ')}.`)
  }
  
  const org = getOrgFromKey({ model, params: req.params, res })
  if (org === false) {
    return
  }
  const { all=false, withRole } = req.query
  
  let staff = withRole === undefined
    ? org.staff.list({ clean : true, rawData : true })
    : org.staff.getByRoleName(withRole, { ownRolesOnly : false })
  
  if (!all) {
    staff = staff.filter((s) => s.employmentStatus !== 'logical')
  }
  
  formatOutput({
    basicTitle : 'Staff Report',
    data : staff,
    mdFormatter,
    reporter,
    req,
    res,
    ...commonOutputConfig(org.staff.constructor.itemConfig, req.query)
  })
}

export { func, parameters, path, method }
