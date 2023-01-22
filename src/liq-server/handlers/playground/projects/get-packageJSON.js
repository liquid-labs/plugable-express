const method = 'get'

const path = ['playground', 'projects', ':localOrgKey', ':localProjectName', 'packageJSON']

const func = ({ model }) => (req, res) => {
  const { localOrgKey, localProjectName } = req.vars

  return res.json(model.playground.orgs[localOrgKey].projects[localProjectName].packageJSON)
}

export { func, path, method }
