import { commonOutputParams, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'get'
const path = [ 'orgs', ':orgKey', 'staff', 'list?' ]

const rolesFetcher = ({ model, orgKey }) => model.orgs[orgKey].roles.list({ rawData: true }).map((r) => encodeURIComponent(r.name))

const parameters = [
  {
    name: 'all',
    isBoolean: true,
    description: "Include all staff, including 'logical' staff members."
  },
  {
    name: 'notRole',
    isMultivalue: true,
    description: "If specified, any staff with any specified role is excluded from the results. May specify multiple times and/or separate roles by comma.",
    optionsFunc: rolesFetcher
  },
  {
    name: 'withRole',
    isMultivalue: true,
    description: "If specified, only staff with all the indicated roles are included in the results. May specify multiple times and/or separate roles by comma.",
    optionsFunc: rolesFetcher
  },
  ...commonOutputParams
]

const mdFormatter = (staff, title) =>
  `# ${title}\n\n${staff.map((s) => `- ${s.familyName}, ${s.givenName} <${s.email}>`).join("\n")}\n`

const textFormatter = (staff, title) =>
  `${title}\n------------------\n\n${staff.map((s) => `- ${s.familyName}, ${s.givenName} <${s.email}>`).join("\n")}\n`

const terminalFormatter = (staff, title) =>
  `<bold>${title}<rst>\n\n${staff.map((s) => `- ${s.familyName}, ${s.givenName} <<underscore>${s.email}<rst>>`).join("\n")}\n`

const func = ({ model, reporter }) => (req, res) => {
  const org = getOrgFromKey({ model, params: req.vars, res })
  if (org === false) {
    return
  }
  const { all=false, notRole, withRole } = req.vars

  let staff
  if (withRole === undefined && notRole === undefined) {
    staff = org.staff.list({ clean: true, rawData: true }) // raw data good enough
  }
  else {
    staff = withRole === undefined
      ? org.staff.list()
      : org.staff.getByRoleName(withRole[0])
  }
  
  if (withRole && withRole.length > 0 || notRole) {
    staff = staff.filter((s) => {
      for (let i = 1; i < withRole?.length; i+= 1) {
        if (!s.hasRole(withRole[i])) return false
      }
      for (let i = 0; i < notRole?.length; i += 1) {
        if (s.hasRole(notRole[i])) return false
      }
      return true
    })
  }
  
  if (!all) {
    staff = staff.filter((s) => s.employmentStatus !== 'logical')
  }
  
  formatOutput({
    basicTitle : 'Staff Report',
    data : staff,
    mdFormatter,
    terminalFormatter,
    textFormatter,
    reporter,
    req,
    res,
    ...org.staff.constructor.itemConfig, 
    ...req.vars
  })
}

export { func, parameters, path, method }
