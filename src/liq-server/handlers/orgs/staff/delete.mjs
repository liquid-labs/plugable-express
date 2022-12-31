import { getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

const method = 'delete'
// '%40' == '@''
const path = [ 'orgs', ':orgKey', 'staff', ':staffKey', 'delete?' ]
const parameters = []

const func = ({ model, reporter }) => (req, res) => {
  const org = getOrgFromKey({ model, params: req.vars, res })
  if (org === false) return
  
  const { staffKey } = req.vars
  
  org.staff.delete(staffKey, { required: true })
  org.save()
  
  res.type('text/terminal').send(
`deleted <em>${staffKey}<rst>
data validated and updated on disk
<warn>must be manually comitted<rst>`)
}

export { func, parameters, path, method }
