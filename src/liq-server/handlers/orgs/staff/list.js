import { commonOutputParams, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const help = {
  name        : 'Staff list',
  summary     : 'Retrieves a list of staff members.',
  description : "By default, returns a list of all staff members except 'logical' staff' (such as placeholder positions). Use parameter 'all' to retrieve all staff records. Additional parameters may be specified to select a subset of staff based on roles."
}

const method = 'get'
const path = ['orgs', ':orgKey', 'staff', 'list?']

const rolesFetcher = ({ model, orgKey }) => model.orgs[orgKey].roles.list({ rawData : true }).map((r) => encodeURIComponent(r.name))

const parameters = [
  {
    name        : 'all',
    isBoolean   : true,
    description : "Include all staff, including 'logical' staff members."
  },
  {
    name         : 'notRole',
    isMultivalue : true,
    description  : 'If specified, any staff with any specified role is excluded from the results. May specify multiple times and/or separate roles by comma.',
    optionsFunc  : rolesFetcher
  },
  {
    name         : 'withAnyRole',
    isMultivalue : true,
    descirption  : "If specified, only staff with any of the indicated roles are included. May specify multiple parameter multiple times and/or separate roles by comma. May be combined with 'withRole'."
  },
  {
    name         : 'withRole',
    isMultivalue : true,
    description  : "If specified, only staff with all the indicated roles are included in the results. May specify multiple times and/or separate roles by comma. May be combined with 'withAnyRole'.",
    optionsFunc  : rolesFetcher
  },
  ...commonOutputParams()
]

const mdFormatter = (staff, title) =>
  `# ${title}\n\n${staff.map((s) => `- ${s.familyName}, ${s.givenName} <${s.email}>`).join('\n')}\n`

const textFormatter = (staff, title) =>
  `${title}\n------------------\n\n${staff.map((s) => `- ${s.familyName}, ${s.givenName} <${s.email}>`).join('\n')}\n`

const terminalFormatter = (staff, title) =>
  `<bold>${title}<rst>\n\n${staff.map((s) => `- ${s.familyName}, ${s.givenName} <<underscore>${s.email}<rst>>`).join('\n')}\n`

const func = ({ model, reporter }) => (req, res) => {
  const org = getOrgFromKey({ model, params : req.vars, res })
  if (org === false) {
    return
  }
  const { all = false, notRole, withAnyRole, withRole } = req.vars

  let staff
  if (withRole === undefined && withAnyRole === undefined && notRole === undefined) {
    // then raw data is good enough
    staff = org.staff.list({ clean : true, rawData : true }) // raw data good enough
  }
  else { // then we'll need ful on Staff objects
    staff = org.staff.list()
  }

  if (!all) {
    staff = staff.filter((s) => s.employmentStatus !== 'logical')
  }

  if (withRole !== undefined) {
    staff = staff.filter((s) => {
      for (const role of withRole) {
        if (!s.hasRole(role)) return false
      }
      return true
    })
  }

  if (withAnyRole !== undefined) {
    staff = staff.filter((s) => {
      for (const role of withAnyRole) {
        if (s.hasRole(role)) return true
      }
      return false
    })
  }

  if (notRole !== undefined) {
    staff = staff.filter((s) => {
      for (const role of notRole) {
        if (s.hasRole(role)) return false
      }
      return false
    })
  }

  formatOutput({
    basicTitle : 'Staff Report',
    data       : staff,
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

export { func, help, method, parameters, path }
