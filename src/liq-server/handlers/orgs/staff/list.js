import { formatOutput, getOrgFromKey } from '../../_lib'

const method = 'get'
const path = '/orgs/:orgKey/staff(/list)?'
const parameters = [
  {
    name: 'all',
    required: false,
    isBoolean: true,
    description: "Include all staff, including 'logical' staff members."
  }
]

const mdFormatter = (staff, title) =>
  `# ${title}\n\n${staff.map((s) => `* ${s.givenName}, ${s.surname} <${s.email}>`)}`

const func = ({ model, reporter }) => (req, res) => {
  const org = getOrgFromKey({ model, params: req.params })
  if (org === false) {
    return
  }
  const { all=false } = req.query
  
  const staff = all
    ? org.staff.list()
    : org.staff.list().filter((s) => s.employmentStatus !== 'logical')

  formatOutput({
    basicTitle : 'Staff Report',
    csvTransform : org.staff.constructor.csvTransform,
    data : staff,
    mdFormatter,
    reporter,
    req,
    res
  })
}

export { func, path, method }
