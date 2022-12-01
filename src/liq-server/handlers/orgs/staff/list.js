import { commonOutputConfig, commonOutputParams, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'get'
const path = [ 'orgs', ':orgKey', 'staff', 'list?' ]

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
  ...commonOutputParams
]

const mdFormatter = (staff, title) =>
  `# ${title}\n\n${staff.map((s) => `* ${s.givenName}, ${s.surname} <${s.email}>`).join("\n")}\n`

const func = ({ model, reporter }) => (req, res) => {
  const org = getOrgFromKey({ model, params: req.vars, res })
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
    ...commonOutputConfig(org.staff.constructor.itemConfig, req.vars)
  })
}

export { func, parameters, path, method }
