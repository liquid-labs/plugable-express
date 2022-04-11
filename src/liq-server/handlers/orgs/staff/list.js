import omit from 'lodash.omit'

import { commonOutputConfig, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

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
    name: 'noHeaders',
    requried: false,
    isBoolean: true,
    description: "Excludes headers row from flat table outputs if 'false'."
  },
  {
    name: 'fields',
    required: false,
    isMultivalue: true,
    description: "An array or comma-separated list of field names."
  }
]
const validParams = parameters.map(p => p.name)
validParams.push('format', 'output')

const mdFormatter = (staff, title) =>
  `# ${title}\n\n${staff.map((s) => `* ${s.givenName}, ${s.surname} <${s.email}>`).join("\n")}\n`

const func = ({ model, reporter }) => (req, res) => {
  const remainder = Object.keys(omit(req.query, validParams))
  if (remainder.length > 0) {
    throw new Error(`Unknown query parameters: ${remainder.join(', ')}.`)
  }
  
  const org = getOrgFromKey({ model, params: req.params, res })
  if (org === false) {
    return
  }
  const { all=false } = req.query
  
  const staff = all
    ? org.staff.list({ clean : true, rawData : true })
    : org.staff.list({ clean : true, rawData : true }).filter((s) => s.employmentStatus !== 'logical')

  formatOutput({
    basicTitle : 'Staff Report',
    data : staff,
    mdFormatter,
    reporter,
    req,
    res,
    ...commonOutputConfig(org.staff, req.query)
  })
}

export { func, parameters, path, method }
