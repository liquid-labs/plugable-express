const method = 'get'

const path = ['playground', 'projects', ':orgKey', ':localProjectName', 'packageJSON']

const func = ({ model }) => (req, res) => {
  const { orgKey, localProjectName } = req.vars

  return res.json(model.playground.orgs[orgKey].projects[localProjectName].packageJSON)
}

export { func, path, method }
