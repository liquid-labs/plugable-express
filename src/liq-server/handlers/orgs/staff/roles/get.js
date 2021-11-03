const verb = 'get'
const path = '/orgs/:orgKey/staff/roles' // TODO: shouldn't this actually end end a '/'?

const func = ({ model }) => (req, res) => {
  const { orgKey } = req.params
  const org = model.orgs[orgKey]
  
  res.json(org.roles.list())
}

export { func, path, verb }
