import { initializeRolesAccess } from './lib/roles-access-lib'

const verb = 'get'
const path = '/orgs/:orgKey/staff/roles/access' // TODO: shouldn't this actually end end a '/'?

const func = ({ model }) => (req, res) => {
  const { orgKey } = req.params
  const org = model.orgs[orgKey]
  
  const rolesAccess = initializeRolesAccess(org)
  
  const { errors } = rolesAccess
  if (errors.length > 0) {
    res.status(500).json({ message: errors.length === 1 ? errors[0] : `* ${errors.join("\n* ")}` })
    return
  }
  
  res.json(rolesAccess.accessRules)
}

export { func, path, verb }
